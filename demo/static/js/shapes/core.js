let shexShapesMap = {};
const SchOrgUrl = 'http://schema.org/';
const SchOrgShEx = SchOrgUrl + 'shex#';

$(document).ready(async () => {
    await $.get(`validation/shex/full.json`, (shexShapes) => {
        shexShapes.shapes.forEach(shape => {
            shexShapesMap[shape.id] = shape;
        });
        const displayMe = location.hash ? SchOrgUrl + location.hash.substr(1) : shexShapes.shapes[0].id
        displayShapesList('', shexShapes);
        selectShape(shexShapes, displayMe);
    });

    $('#search').on('input', function () {
        displayShapesList($(this).val(), shexShapes);
    })
});

function displayShapesList(search, shexShapes) {
    $('.shapes-list').empty();

    search = search.trim();
    let shapeIds = Object.keys(shexShapesMap);
    if (search.length > 0) {
        shapeIds = shapeIds.filter(x => x.toLowerCase().includes(search.toLowerCase()));
    }

    shapeIds.forEach(shape => {
        $('.shapes-list').append(`<div class="shape-id">${shape}</div>`);
    });

    $('.shape-id').click(function () {
        const shapeId = $(this).text();
        selectShape(shexShapes, shapeId);
    });
}

async function selectShape(shexShapes, shapeId) {
    const shape = shexShapesMap[shapeId];
    $('.shape-id').removeClass('displayed');
    $(`.shape-id`).filter(function () {
        return $(this).text().toLowerCase() === shapeId.toLowerCase()
    }).addClass('displayed');
  debugger
    const selected = shexShapes.shapes.find(s => s.id === shapeId)
    // $('#display').val(JSON.stringify(shape, null, 2));
    $('#displayed-shape-id').html(shapeId);
    $("#display").empty();
    await ShExHTML($, {Renderer: function () {
        throw Error(47)
    }}).asTree({type: "Schema", shapes: [selected]}, SchOrgUrl, {
      '': SchOrgShEx,
    }, $('#display'), {
      property: {
        post: (elt, property) => {
          elt.attr('href', property)
          return elt
        }
      },
      shapeLabel: {
        post: (elt, shapeLabel) =>
          elt.on('click', evt => {
            selectShape(shexShapes, shapeLabel);
            return true;
          })
      }
    })
}
