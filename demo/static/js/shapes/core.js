let shexShapesMap = {};
const XsdUrl = 'http://www.w3.org/2001/XMLSchema#';
const SchOrgUrl = 'http://schema.org/';
const SchOrgShEx = SchOrgUrl + 'validation#';
const ShExRenderer = ShExHTML($, {Renderer: function () {
  throw Error(47) // fake a markdown renderer 'cause we don't have annotations
}})

$(document).ready(async () => {
    await $.get(`validation/shex/full.json`, (shexShapes) => {
        shexShapes.shapes.forEach(shape => {
            shexShapesMap[shape.id] = shape;
        });
        displayShapesList('', shexShapes);
        window.addEventListener('popstate', renderLocation);
        renderLocation();

        function renderLocation () {
            const displayMe = location.hash ? SchOrgShEx + location.hash.substr(1) : shexShapes.shapes[0].id
            selectShape(shexShapes, displayMe);
        }

        $('#search').on('input', function () {
            displayShapesList($(this).val(), shexShapes);
        })
    });
});

function displayShapesList(search, shexShapes) {
    $('.shapes-list').empty();

    search = search.trim();
    let shapeIds = Object.keys(shexShapesMap);
    if (search.length > 0) {
        shapeIds = shapeIds.filter(x => x.toLowerCase().includes(search.toLowerCase()));
    }

    shapeIds.forEach(shape => {
        $('.shapes-list').append(`<div class="shape-id">${shape.substr(SchOrgShEx.length)}</div>`);
    });

    $('.shape-id').click(function () {
        const shapeId = $(this).text();
        location.hash = shapeId;
        // No need to `selectShape(shexShapes, SchOrgShEx + shapeId)`, handled by 'popstate' listener voodoo.
    });
}

async function selectShape(shexShapes, shapeId) {
    const shape = shexShapesMap[shapeId];
    $('.shape-id').removeClass('displayed');
    $(`.shape-id`).filter(function () {
        return $(this).text() === shapeId.substr(SchOrgShEx.length)
    }).addClass('displayed');

    const selected = shexShapes.shapes.find(s => s.id === shapeId)
    // $('#display').val(JSON.stringify(shape, null, 2));
    $('#displayed-shape-id').html(shapeId);
    $("#display").empty();
    await ShExRenderer.asTree(shexShapes, SchOrgShEx, {
      '': SchOrgUrl,
      'xsd': XsdUrl,
    }, $('#display'), {
      toRender: [selected],
      property: {
        post: (elt, property) => {
          elt.attr('href', property)
          return elt
        }
      },
    })
}
