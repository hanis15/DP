// JavaScript source code

function GeoGraph(id, width, height) {
    var projection;
    var main_svg_element;
    var path;
    var zoom;
    var current_type;       // uchovava posledni nastaveni (typ zobrazeni)
    this.create_graph = load_graph;
    this.set_type = set_projection;
    this.set_data = set_location_data;

    function set_location_data(data) {
        var json_data = jQuery.parseJSON(data);

        // zobrazeni dat z nacteneho JSON souboru
        main_svg_element.selectAll("path")
            .data(json_data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "location")
            .style("fill", "red")
            .style("stroke", "green")
            .style("stroke-width", "2")
            .call(zoom);

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
        if (type == 'cz') {
            projection = d3.geo.mercator()
                               .center([15.6, 50.1]) // musi se doplnit souradnice podle podkladu
                               .scale([7000]);
        }
        else { // brno
            projection = d3.geo.mercator()
                               .center([16.6092500, 49.1949722])
                               .scale([200000]);
        }

        //Define path generator
        path = d3.geo.path()
                        .projection(projection);

        //Create SVG element
        main_svg_element = d3.select(id)
                    .attr("width", width)
                    .attr("height", height)
                    .append("g");
        
        zoom = d3.behavior.zoom()
                            .translate([0, 0])
                            .scale(1)
                            .scaleExtent([1, 80])
                            .on("zoom", zoomed);
            
        main_svg_element.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height)
                    .call(zoom);

        if (type == 'cz') {
            //Load in GeoJSON data
            d3.json("json/CZE.geo.json", function (json) {

                //Bind data and create one path per GeoJSON feature
                main_svg_element.selectAll("path")
                   .data(json.features)
                   .enter()
                   .append("path")
                   .attr("class", "location_area")
                   .attr("d", path)
                   .style("fill", "white")
                   .style("stroke", "blue")
                   .style("stroke-width", "1")
                   .call(zoom)
                   .attr("title", function (d) { return d.id; });
            });
        }
            
        function zoomed() {
            main_svg_element.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            main_svg_element.select(".location_area").style("stroke-width", 1.5 / d3.event.scale + "px");
            main_svg_element.selectAll(".location").style("stroke-width", .5 / d3.event.scale + "px");
        }

        d3.select(self.frameElement).style("height", height + "px");
    }
}