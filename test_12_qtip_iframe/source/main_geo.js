// JavaScript source code

function GeoGraph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {
        
        //Define map projection
        var projection = d3.geo.mercator()
                               .translate([width / 2, height / 2])
                               .scale([7000]);

        //Define path generator
        var path = d3.geo.path()
                         .projection(projection);

        //Create SVG element
        var svg = d3.select(id)
                    .attr("width", width)
                    .attr("height", height)
                    .append("g");

        var g = svg.append("g");

        var scale0 = (width - 1) / 2 / Math.PI;

        svg.append("rect")
                    .attr("class", "overlay")
                    .attr("width", width)
                    .attr("height", height);
        
        
            
        //Load in GeoJSON data
        d3.json("CZE.geo.json", function (json) {
        //d3.json("cz-all.geo.json", function (json) {
            /*
            g.append("path")
              .datum({ type: "Sphere" })
              .attr("class", "sphere")
              .attr("d", path);


            //Bind data and create one path per GeoJSON feature
            g.selectAll("path")
               .data(json.features)
               .enter()
               .append("path")
               .attr("d", path)
               .style("fill", "white")
               .style("stroke", "blue")
               .attr("transform", "translate(-1900,7000)")
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
        /*
        // nacteni dat z "configu"
        d3.json("json/geoJSON.json", function (json) {
            //d3.json("cz-all.geo.json", function (json) {

            //Bind data and create one path per GeoJSON feature
            g.selectAll("path")
               .data(json.features)
               .enter()
               .append("path")
               .attr("d", path)
               .style("fill", "red")
               .style("stroke", "green")
               .attr("transform", "translate(-1900,7000)");

        });
        */
        

        d3.select(self.frameElement).style("height", height + "px");
        //d3.json("json/geo_v1.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;
        /*
        var edges = [];
        // uprava souradnic aby mohl prvni najit odpovidajici uzel a pak az jeho koordinaty
        data.routes.forEach(function (e) {
            var sourceNode = data.networks.filter(function (n) {
                return n.name === e.source;
            })[0],
                targetNode = data.networks.filter(function (n) {
                    return n.name === e.target;
                })[0];

            edges.push({
                source: sourceNode,
                targer: targetNode,
                name: e.name,
                weight: 1
                //x: sourceNode.latitude,
                //y: sourceNode.longitude,
                //px: sourceNode.latitude,
                //py: sourceNode.longitude
            });
        });
        */
        force = d3.layout.force()
            .charge(10)
            //.linkDistance(200)
            .size([width, height]);

        force
            .nodes(data.networks)
            .links(data.routes)
            .start();

        //d3.select(id)
        //.attr("viewbox", "48 16 2 2")
        //.attr("preserveAspectRatio", "xMinYMin meet")
        //.attr("preserveAspectRatio", "xMinYMid meet")
        //.attr("width", width+"px")
        //.attr("height", height + "px");
        //.attr("style", "border: 1px solid black;");

        svg = d3.select(id)
            .append("svg")
            .attr("viewbox", "45 15 5 2")
            .attr("preserveAspectRatio", "xMinYMin meet");
        //viewBox="0 0 900 600" preserveAspectRatio="xMinYMin meet"
            //.attr("x", "0")
            //.attr("y", "0")
            //.attr("height", "100%")
            //.attr("width", "100%");

        link = svg.selectAll(".link")
            .data(data.routes)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", function (d) { return d.bandwidth / 100; });
            //.on("mouseover", line_mouse_over)
            //.on("mouseout", line_mouse_out);


        //link.append("title")
        //    .text(function (d) { return d.name; });

        node = svg.selectAll(".node")
            .data(data.networks)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 0.001)
            //.attr("cx", function (d) { return d.longitude; })
            //.attr("cy", function (d) { return d.latitude; })
            .style("fill", function (d) { return d.name == "FI_MUNI" ? "red" : "green"; });
            //.call(force.drag)

        node.append("title")
            .text(function (d) {
                return d.name;
            });

        $("svg line").qtip({
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

        var positions = data.routes.map(function (d) { return [d.longitude, d.latitude]; });

        force.on("tick", function () {
            link.attr("x1", function (d) { return d.source.longitude; })
                .attr("y1", function (d) { return d.source.latitude; })
                .attr("x2", function (d) { return d.target.longitude; })
                .attr("y2", function (d) { return d.target.latitude; });

            node.attr("cx", function (d) { return d.longitude; })
                .attr("cy", function (d) { return d.latitude; });
        });
    }
}