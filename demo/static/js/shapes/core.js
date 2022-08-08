let shexShapesMap = {};

$(document).ready(async () => {
    await $.get(`shex/shapes`, (res) => {
        const shexShapes = JSON.parse(res);
        shexShapes.shapes.forEach(shape => {
            shexShapesMap[shape.id] = shape;
        });
        displayShapesList('');
        selectShape(Object.keys(shexShapesMap)[0]);
    });

    $('#search').on('input', function () {
        displayShapesList($(this).val());
    })
});

function displayShapesList(search) {
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
        selectShape(shapeId);
    });
}

function selectShape(shapeId) {
    const shape = shexShapesMap[shapeId];
    $('.shape-id').removeClass('displayed');
    $(`.shape-id`).filter(function () {
        return $(this).text().toLowerCase() === shapeId.toLowerCase()
    }).addClass('displayed');
    $('#display').val(JSON.stringify(shape, null, 2));
    $('#displayed-shape-id').html(shapeId);
}
