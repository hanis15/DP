// JavaScript source code

function GeoGraph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {
        
        //Define map projection
        var projection = d3.geo.mercator()
                               .center([16.960288, 49.596982]) // musi se doplnit souradnice podle podkladu
                               .scale([6000]);

        //Define path generator
        var path = d3.geo.path()
                        .projection(projection);

        //Create SVG element
        var svg = d3.select(id)
                    .attr("width", width)
                    .attr("height", height)
                    .append("g");

        svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height);
        
        var zoom = d3.behavior.zoom()
                            .translate([0, 0])
                            .scale(1)
                            .scaleExtent([1, 80])
                            .on("zoom", zoomed);
            
        //Load in GeoJSON data
        d3.json("CZE.geo.json", function (json) {

            //Bind data and create one path per GeoJSON feature
            svg.selectAll("path")
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
            /*
            $("path").qtip({
                content: {
                    button: 'Close',
                    title: function (event, api) {
                        return api.elements.target.attr("title");
                    },
                    text: function (event, api) {
                        $.get({
                            url: 'data.html' // Use href attribute as URL
                        })
                        .then(function (content) {
                            // Set the tooltip content upon successful retrieval
                            api.set('content.text', content);
                        }, function (xhr, status, error) {
                            // Upon failure... set the tooltip content to error
                            api.set('content.text', status + ': ' + error);
                        });
                        return "Lodaing :)...";
                    },
                },
                show: { solo: true },
                hide: 'unfocus',
                position: {
                    my: 'left center',
                    at: 'right center',
                    adjust: {
                        screen: true
                    }
                },
                style: 'qtip-wiki'
            });
            */
        });

        // nacteni dat z "configu"
        d3.json("json/geoJSON.json", function (json) {

            //Bind data and create one path per GeoJSON feature
            svg.selectAll("path")
               .data(json.features)
               .enter()
               .append("path")
               .attr("d", path)
               .attr("class", "location")
               .style("fill", "red")
               .style("stroke", "green")
               .style("stroke-width", "1")
               .call(zoom);
        });
        

        function zoomed() {
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            svg.select(".location_area").style("stroke-width", 1.5 / d3.event.scale + "px");
            svg.selectAll(".location").style("stroke-width", .5 / d3.event.scale + "px");
        }

        

        d3.select(self.frameElement).style("height", height + "px");
    }
}