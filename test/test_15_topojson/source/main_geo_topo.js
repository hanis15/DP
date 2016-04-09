// JavaScript source code

function GeoGraph(id, width, height) {
    var projection;
    var main_svg_element;
    var path;
    var zoom;
    var graticule;
    var g;
    var current_type;       // uchovava posledni nastaveni (typ zobrazeni)
    this.create_graph = load_graph;
    this.set_type = set_projection;
    this.set_data = set_location_data;

    function set_location_data(data) {
        var json_data = jQuery.parseJSON(data);

        // zobrazeni dat z nacteneho JSON souboru
        main_svg_element.append("g").selectAll("path")
            .data(json_data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "location")
            .style("fill", "red")
            .style("stroke", "green")
            .style("stroke-width", "2");

        $(".location").qtip({
            content: {
                button: 'Close',
                title: function (event, api) {
                    return api.elements.target.attr("title");
                },
                text: $('<iframe height="180" width="640" src="data.html" />')
            },
            show: { solo: true },
            hide: 'unfocus',
            position: {
                my: 'left top',
                at: 'right top',
                adjust: {
                    screen: true
                }
            },
            style: {
                classes: 'qtip-bootstrap',
                width: 660,
                height: 230
            }
        });
    }

    // nastavi souradnicovy system + zobrazi geoJSON na pozadi
    function set_projection(type) {
        if (main_svg_element != null) {
            main_svg_element.remove();
        }
        this.create_graph(type);
    }

    function load_graph(type) {
        
        //Define map projection
        projection = d3.geo.mercator()
                           .scale((width + 1) / 2 / Math.PI)
                           .translate([width / 2, height / 2])
                           .precision(.1);

        //Define path generator
        path = d3.geo.path()
                        .projection(projection);

        
        //Create SVG element
        main_svg_element = d3.select(id)
                    .attr("width", width)
                    .attr("height", height);

        scale0 = (width - 1) / 2 / Math.PI;

        zoom = d3.behavior.zoom()
            .translate([width / 2, height / 2])
            .scale(scale0)
            .scaleExtent([scale0, 800 * scale0])
            .on("zoom", zoomed);

        graticule = d3.geo.graticule();


        g = main_svg_element.append("g");

        main_svg_element.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height);

        main_svg_element
            .call(zoom)
            .call(zoom.event);

        main_svg_element.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path);

        d3.json("json/world-110m.json", function (world) {
            main_svg_element.insert("path", ".graticule")
                            .datum(topojson.feature(world, world.objects.land))
                            .attr("class", "land")
                            .attr("d", path);

            main_svg_element.insert("path", ".graticule")
                            .datum(topojson.mesh(world, world.objects.countries, function (a, b) { return a !== b; }))
                            .attr("class", "boundary")
                            .attr("d", path);

        });
            
        function zoomed() {
            projection
                .translate(zoom.translate())
                .scale(zoom.scale());

            main_svg_element.selectAll(".land")
                .attr("d", path);
            main_svg_element.selectAll(".boundary")
                .attr("d", path);
            main_svg_element.selectAll(".location")
                .attr("d", path);
        }

        d3.select(self.frameElement).style("height", height + "px");
    }
}