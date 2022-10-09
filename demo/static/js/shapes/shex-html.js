
var ShExHTML = (function () {
  const UPCLASS = 'extends up'
  const KEYWORD = 'keyword'
  const SHEXMI = 'http://www.w3.org/ns/shex-xmi#'
  const COMMONMARK = 'https://github.com/commonmark/commonmark.js'
  const CLASS_comment = 'comment'
  const CLASS_pname = 'pname'
  const CLASS_prefix = 'prefix'
  const CLASS_localname = 'localname'
  const CLASS_native = 'native'
  const CLASS_literal = 'literal'
  const CLASS_shapeExpr = 'shapeExpr'
  const ARROW_up = '⇧'
  const ARROW_down = '⇩'

  return function ($, marked, opts) {
  const MARKED_OPTS = {
    "baseUrl": null,
    "breaks": false,
    "gfm": true,
    "headerIds": true,
    "headerPrefix": "",
    "highlight": null,
    "langPrefix": "lang-",
    "mangle": true,
    "pedantic": false,
    "renderer": Object.assign({}, marked.Renderer.prototype, {
      // "options": null
      heading: function(text, level, raw) {
        if (this.options.headerIds) {
          return '<h'
            + (parseInt(level) + 3) // start at h4
            + ' id="'
            + this.options.headerPrefix
            + raw.toLowerCase().replace(/[^\w]+/g, '-')
            + '">'
            + text
            + '</h'
            + (parseInt(level) + 3)
            + '>\n';
        }
        // ignore IDs
        return '<h' + level + '>' + text + '</h' + level + '>\n';
      }
    }),
    "sanitize": false,
    "sanitizer": null,
    "silent": false,
    "smartLists": false,
    "smartypants": false,
    "tables": true,
    "xhtml": false
  }

    return { asTree }

    function asTree (schema, namespace, prefixes, schemaBox = $('<div/>'), opts = {}) {
      // Set up default opts.
      for (const objProp of ['shapeLabel', 'property'])
        if (!(objProp in opts))
          opts[objProp] = {}

      const packageRef = [null]
      let packageDiv = null
      schemaBox.append(
        $('<table/>', { class: 'prolog' }).append([
          $('<tr/>', {class: 'base-decl'}).append(
            $('<th/>').text('base'),
            $('<td/>', {colspan: 2}).text(namespace),
          )
        ].concat(Object.keys(prefixes || []).reduce(
          (acc, prefix, idx) => acc.concat(
            $('<tr/>', {class: 'prefix-decl'}).append(
              (idx === 0 ? $('<th/>').text('prefixes') : $('<td/>')),
              $('<th/>', {class: 'prefix'}).text(prefix + ':'),
              $('<td/>', {class: 'localname'}).text(prefixes[prefix])
            )
          ), [])))
      )
      return Promise.all(schema.shapes.map(
        (shapeDecl, idx) => {
          return new Promise((resShape, rejShape) => {
            setTimeout(() => {
              let last = idx === schema.shapes.length - 1
              let oldPackage = packageRef[0]
              let add = renderDecl(shapeDecl, packageRef, 0)
              if (oldPackage !== packageRef[0]) {
                packageDiv = $('<section>')
                packageDiv.append($('<h2/>', {class: CLASS_native}).text(trimStr(packageRef[0])))
                schemaBox.append(packageDiv)
                oldPackage = packageRef[0]
              }
              (packageDiv || schemaBox).append(add)
              resShape(add)
            }, 0)
          })
        }
      ))

      function renderDecl (shapeDecl, packageRef, depth) {
        const shapeLabel = shapeDecl.id;
        const id = trimStr(shapeLabel)
        let abstract = false
        if (shapeDecl.type === 'ShapeDecl') {
          abstract = shapeDecl.abstract
          shapeDecl = shapeDecl.shapeExpr
        }
        let declRow = $('<tr/>')
            .attr('data-inclusionDepth', depth)
            .append(
              $('<td/>').append(trim(shapeLabel)),
              $('<td/>'),
              $('<td/>')
            )
        let div = $('<section/>', {id: id})
        div.append($(`<div class="header-wrapper"><h3 id="${id}"><bdi class="secno"></bdi>${id}</h3><a class="self-link" href="#${encodeURIComponent(id)}" aria-label="Permalink for ${id}"></a></div>`))
        // div.append($('<h3/>').append(trim(shapeLabel)))
        let shexmiAnnots = (shapeDecl.annotations || []).filter(
          a => a.predicate.startsWith(SHEXMI)
        )
        shexmiAnnots.forEach(
          a => {
            switch (a.predicate.substr(SHEXMI.length)) {
            case 'package':
              packageRef[0] = a.object.value
              break
            case 'comment':
              switch (a.object.type) {
              case COMMONMARK:
                div.append(
                  $('<div/>', { class: CLASS_comment, colspan: 2 }).append(marked.parse(
                    a.object.value, MARKED_OPTS
                  ))
                )
                break
              default:
                div.append(
                  $('<pre/>', { class: CLASS_comment, colspan: 2 }).text(a.object.value)
                )
              }
              break
            default:
              throw Error('unknown shexmi annotation: ' + a.predicate.substr(SHEXMI.length))
            }
          }
        )

        // @@ does a NodeConstraint render differently if it's in a nested vs. called from renderDecl?
        div.append($('<table/>', {class: CLASS_shapeExpr}).append(renderShapeExpr(shapeDecl, '', declRow, abstract, [], depth)))
        return div
      }

      function renderShapeExpr (expr, lead, declRow, abstract, parents, depth) {
        let top = declRow ? [declRow] : []
        switch (expr.type) {
        case 'Shape':
          if ('extends' in expr) {
            let exts = expr.extends.slice() // copy extends into mutable array

            if (declRow) {
              // Update the declRow with the first extends.
              updateDecl(ref(exts.shift(), depth), 'includer');
            }

            // Each additional extends gets its own row.
            top = top.concat(exts.map(
              ext => $('<tr/>')
                .attr('data-inclusionDepth', depth)
                .addClass('includer')
                .append(
                  $('<td/>').text(lead + '│' + '   '),
                  $('<td/>').append(ref(ext, depth)),
                  $('<td/>')
                )
            ))
          }
          return top.concat(renderTripleExpr(expr.expression, lead, true, depth))
        case 'NodeConstraint':
          // return renderInlineNodeConstraint(expr);
          const ret = [];
          if ('values' in expr) {
            [].push.apply(ret, top.concat(expr.values.map(
              addRow(trimStr(val), 'value')
            )))
          }
          if ('nodeKind' in expr) {
            addRow(expr.nodeKind, 'nodeKind');
          }
          if ('datatype' in expr) {
            addRow($('<a/>', {href: '#' + encodeURIComponent(trim(expr.datatype).text()), class: 'datatype'}).append(trim(expr.datatype)));
          }
          if ('pattern' in expr) {
            addRow('/' + expr.pattern.replace(/\//g, '\\/') + '/', 'pattern');
          }
          if (ret.length === 0) {
            throw Error(`failed to process NodeConstraint ${JSON.stringify(expr)}`);
          }
          return ret;

          function addRow (col2, classname) {
            if (ret.length === 0) {
              updateDecl(col2, classname)
              ret.push(declRow)
            } else {
              ret.push($(`<tr data-inclusionDepth="${depth}" class="${classname}"><td></td><td>${lead}/${col2}/</td><td></td></tr>`))
            }
          }
        case 'ShapeOr':
        case 'ShapeAnd':
            const labels = {
              'ShapeOr': ['EITHER', 'OR'],
              'ShapeAnd': ['BOTH', 'AND'],
            }
            return top.concat(expr.shapeExprs.reduce(
              (acc, junct, idx) => acc.concat([
                $('<tr/>').append($(`<td>${lead}${labels[expr.type][idx === 0 ? 0 : 1]}</td>`))
              ]).concat(
                typeof junct === 'string'
                  ? $(`<tr data-inclusionDepth="${depth}">`).append(
                    $('<td/>'),
                    $('<td/>').append(renderInlineShape(junct)),
                    $('<td/>')
                  )
                  : renderShapeExpr(junct, '&nbsp;&nbsp;&nbsp;&nbsp;' + lead, $(`<tr data-inclusionDepth="${depth}"><td></td><td></td><td></td></tr>`), false, [], depth)
              ),
              []
            ))
        default:
          throw Error('renderShapeExpr has no handler for ' + JSON.stringify(expr, null, 2))
        }

        function ref (ext, depth) {
          let arrow = $('<span/>', {class: UPCLASS}).text(ARROW_down)
          arrow.on('click', (evt) => {
            inject(evt, ext, parents, depth)
          })
          return [arrow, $('<a/>', {href: '#' + encodeURIComponent(trim(ext).text()), class: UPCLASS}).append(trim(ext))]
        }

        function inject (evt, ext, parents, depth) {
          let arrow = $(evt.target)
          let tr = arrow.parent().parent()
          // let add = renderTripleExpr(schema.shapes[ext].expression, lead, false)
          let shapeDecl = schema.shapes.find(s => s.id === ext)
          if (shapeDecl.type === 'ShapeDecl') {
            shapeDecl = shapeDecl.shapeExpr
          }
          let allMyElts = []
          let add = renderShapeExpr(shapeDecl, lead, null, false, allMyElts, depth + 1)
          Array.prototype.splice.apply(allMyElts, [0, 0].concat(add))
          Array.prototype.splice.apply(parents, [0, 0].concat(allMyElts))
          add.forEach(elt => elt.hide())
          tr.after(add)
          add.forEach(elt => elt.show('slow'))
          arrow.off()
          arrow.text(ARROW_up)
          arrow.on('click', (evt) => remove(arrow, evt, ext, allMyElts))
          return false
        }

        function remove (arrow, evt, ext, doomed) {
          arrow.off()
          doomed.forEach(elt => elt.hide('slow', function() { elt.remove();}))
          arrow.text(ARROW_down)
          arrow.on('click', (evt) => inject(evt, ext, [], depth))
        }

        function updateDecl (col2, classname) {
          declRow.find('td:nth-child(2)')
            .append(col2)
          declRow.addClass(classname)
        }
      }

      function renderTripleExpr(expr, lead, last, depth) {
        if (!expr) {
          return $(`<tr/>`).append(
            $('<td/>').html(lead + '◯'),
            $('<td/>'),
            $('<td/>'),
          )
        }
        switch (expr.type) {
        case 'EachOf':
          return expr.expressions.reduce(
            (acc, nested, i) => acc.concat(renderTripleExpr(nested, lead, i === expr.expressions.length - 1, depth)), []
          )
        case 'TripleConstraint':
          let inline = renderInlineShape(expr.valueExpr)
          let predicate = trim(expr.predicate, opts.property.post)
          let comments = (expr.annotations || []).filter(
            a => a.predicate === SHEXMI + 'comment'
          ).map(
            a => a.object.value
          )
          const predicateTD = $('<td/>').append(
            lead,
            last ? '└' :  '├',
            $('<span/>', {class: 'arrows'}).text(expr.valueExpr === undefined ? '◯' : expr.valueExpr.type === 'NodeConstraint' ? '▭' : '▻'),
            predicate
          )
          if (comments.length > 0) {
            predicateTD.attr('title', comments[0])
          }
          let declRow = $('<tr/>')
              .attr('data-inclusionDepth', depth)
              .append(
                predicateTD,
                $('<td/>').append(inline),
                $('<td/>').text(renderCardinality(expr))
              )
          let commentRows = comments.map(
            comment => $('<tr/>', {class: 'annotation'})
              .attr('data-inclusionDepth', depth)
              .append(
                $('<td/>', {class: 'lines'}).html(lead + '│' + '   '),
                $('<td/>', {class: 'comment', colspan: 2}).text(comment)
              )
          )

          return commentRows.concat(inline === '' ? renderNestedShape(expr.valueExpr, lead + (last ? '   ' : '│') + '   ', declRow, depth) : [declRow])
        default:
          throw Error('renderTripleExpr has no handler for ' + expr.type)
        }
      }

      function renderInlineShape (valueExpr) {
        if (typeof valueExpr === 'string')
          return trim(valueExpr, opts.shapeLabel.post)

        return valueExpr === undefined
          ? '.'
          : valueExpr.type === 'Shape'
          ? ''
          : valueExpr.type === 'NodeConstraint'
          ? renderInlineNodeConstraint(valueExpr)
          : valueExpr.type === 'ShapeOr'
          ? valueExpr.shapeExprs.map(renderInlineShape).reduce(
            (acc, elt, idx) => {
              if (idx !== 0) {
                acc = acc.concat(' ', $("<span/>", { class: 'keyword'}).text("OR"), ' ')
              }
              return acc.concat(elt)
            }, []
          )
          : valueExpr.type === 'ShapeAnd'
          ? valueExpr.shapeExprs.map(renderInlineShape).reduce(
            (acc, elt, idx) => {
              if (idx !== 0) {
                acc = acc.concat(' ', $("<span/>", { class: 'keyword'}).text("AND"), ' ')
              }
              return acc.concat(elt)
            }, []
          )
        : (() => { throw Error('renderInlineShape doesn\'t handle ' + JSON.stringify(valueExpr, null, 2)) })()
      }

      function renderInlineNodeConstraint (expr) {
        let ret = [];
        let keys = Object.keys(expr)
        let append = appender(ret)
        let take = (key) => take1(keys, key)

        take('type')
        if (take('datatype')) { append(trim(expr.datatype)) }
        if (take('values')) { append('[', expr.values.reduce(
          (acc, v, idx) => acc.concat(idx === 0 ? null : ' ', trimStr(v)), []
        ), ']') }
        if (take('nodeKind')) { append($('<span/>', { class: 'keyword'}).text(expr.nodeKind)) }
        if (take('pattern')) { append($('<span/>', { class: 'keyword'}).text('/' + expr.pattern + '/')) }
        if (keys.length) {
          throw Error('renderInlineNodeConstraint didn\'t match ' + keys.join(',') + ' in ' + JSON.stringify(expr, null, 2))
        }
        return ret

      }

      function take1 (keys, key) {
        let idx = keys.indexOf(key)
        if (idx === -1) {
          return false
        } else {
          keys.splice(idx, 1)
          return true
        }
      }

      function append1 () {
        for (let i = 1; i < arguments.length; ++i) {
          let elts = arguments[i].constructor === Array
              ? arguments[i]
              : [arguments[i]]
          elts.forEach(elt => { arguments[0].push(elt) })
        }
      }
      function appender (target) {
        return function () {
          return append1.apply(null, [target].concat([].slice.call(arguments)))
        }
      }

      function renderNestedShape (valueExpr, lead, declRow, depth) {
        if (valueExpr.type !== 'Shape') {
          return declRow
        }
        return renderShapeExpr(valueExpr, lead, declRow, false, [], depth)
      }

      function renderCardinality (expr) {
        let min = 'min' in expr ? expr.min : 1
        let max = 'max' in expr ? expr.max : 1
        return min === 0 && max === 1
          ? '?'
          : min === 0 && max === -1
          ? '*'
          : min === 1 && max === 1
          ? ''
          : min === 1 && max === -1
          ? '+'
          : '{' + min + ',' + max + '}'
      }

      function trim (term, post) {
        if (typeof term === 'object') {
          if ('value' in term)
            return $('<span/>', {class: CLASS_literal}).text('"' + term.value + '"')
          throw Error('trim ' + JSON.stringify(term))
        }
        if (term === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
          return $('<span/>', {class: KEYWORD}).text('a')
        if (term.startsWith(namespace)) {
          const aOpts = {class: CLASS_native, href: '#' + term.substr(namespace.length)}
          let ret = $('<a/>', aOpts).text(term.substr(namespace.length))
          if (post)
            ret = post(ret, term)
          return ret
        }
        for (var prefix in prefixes) {
          if (term.startsWith(prefixes[prefix])) {
            return $('<span/>', {class: CLASS_pname}).append(
              $('<span/>', {class: CLASS_prefix}).text(prefix + ':'),
              $('<span/>', {class: CLASS_localname}).text(term.substr(prefixes[prefix].length))
            )
            let pre = $('<span/>', {class: CLASS_prefix}).text(prefix + ':')
            let loc = $('<span/>', {class: CLASS_localname}).text(term.substr(prefixes[prefix].length))
            let ret = $('<span/>', {class: CLASS_pname})
            ret.prepend(pre)
            pre.after(loc)
            return ret
            return $(`<span class="${CLASS_pname}"><span class="${CLASS_prefix}">${prefix}:</span><span class="${CLASS_localname}">${term.substr(prefixes[prefix].length)}</span></span>`)
          }
        }
        return term
      }

      function trimStr (term) {
        if (typeof term === 'object') {
          if ('value' in term)
            return '"' + term.value + '"'
          if (term.type === 'IriStem') {
            return '&lt;' + term.stem + '&gt;~'
          }
          throw Error('trim ' + JSON.stringify(term))
        }
        if (term === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
          return 'a'
        if (term.startsWith(namespace))
          return term.substr(namespace.length)
        for (let prefix in prefixes) {
          if (term.startsWith(prefixes[prefix])) {
            return prefix + ':' + term.substr(prefixes[prefix].length)
          }
        }
        return term
      }
    }
  }
})()

if (typeof require !== 'undefined' && typeof exports !== 'undefined')
  module.exports = ShExHTML;
