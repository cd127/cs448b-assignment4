'use strict';

// Assumes you've included D3 version 5 somewhere above:
// e.g. <script src="https://d3js.org/d3.v5.min.js"></script>

// eslint-disable-next-line
class D3voronoi {
    constructor(svg, paddingX = 0, paddingY = 0) {
        this.svg;
        this.width;
        this.height;
        this.voronoi;
        this.setDimensions(svg, paddingX, paddingY);
    }

    setDimensions(svg, paddingX = 0, paddingY = 0) {
        this.svg = svg;
        this.width = +svg.attr('width');
        this.height = +svg.attr('height');
        this.voronoi = d3.voronoi().extent([
            [paddingX, paddingY],
            [this.width - paddingX, this.height - paddingY]
        ]);
    }

    setCoordinates(coordinates) {
        this.coordinates = coordinates;
    }

    render(data, fx, fy) {
        this.voronoi = this.voronoi.x(fx).y(fy);
        this.polygon = this.svg
            .append('g')
            .attr('class', 'polygons')
            .style('visibility', 'hidden')
            .selectAll('path')
            .data(this.voronoi.polygons(data))
            .enter()
            .append('path')
            .call(polygon => {
                polygon.attr('d', function(d) {
                    return d ? 'M' + d.join('L') + 'Z' : null;
                });
            });
        this.diagram = this.voronoi(data);
    }

    findcell(m, callback) {
        this.polygon.attr('fill', '');
        var found = this.diagram.find(m[0], m[1], 50);

        if (found) callback(found);
        // Below code calls the callback on the d3 element.
        // if (found) callback(this.polygon._groups[0][found.index]);
    }

    redraw() {
        this.polygon = this.polygon.data(this.diagram.polygons()).call(polygon => {
            polygon.attr('d', function(d) {
                return d ? 'M' + d.join('L') + 'Z' : null;
            });
        });
    }
}
