// JavaScript source code

function GeoGraph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {
        /*
        //Define map projection
        var projection = d3.geo.mercator()
                                 //.translate([width/100, height/100]);
                               .scale([00]);

        //Define path generator
        var path = d3.geo.path()
                         .projection(projection);

        //Create SVG element
        var svg = d3.select(id)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);

        //Load in GeoJSON data
        d3.json("geoJSON.json", function (json) {

            //Bind data and create one path per GeoJSON feature
            svg.selectAll("path")
               .data(json.features)
               .enter()
               .append("path")
               .attr("d", path)
               .style("fill", "steelblue")
               .attr("transform", "translate(-800,200)");

        });
        */
        d3.json("geo.json", parse_data);
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
            .linkDistance(200)
            .size([width, height]);

        force
            .nodes(data.networks)
            .links(data.routes)
            .start();

        svg = d3.select(id).append("svg")
            .attr("viewbox", "400 100 500 200")
            .attr("width", width)
            .attr("height", height);
            //.attr("style", "border: 1px solid black;");

        link = svg.selectAll(".link")
            .data(data.routes)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", function (d) { return d.bandwidth / 100; })
            .attr("title", function (d) { return d.name; });
            //.on("mouseover", line_mouse_over)
            //.on("mouseout", line_mouse_out);


        //link.append("title")
        //    .text(function (d) { return d.name; });

        node = svg.selectAll(".node")
            .data(data.networks)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 10)
            .attr("cx", function (d) { return d.latitude * 10; })
            .attr("cy", function (d) { return d.longitude * 10; })
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

        force.on("tick", function () {
            link.attr("x1", function (d) { return d.source.latitude * 10; })
                .attr("y1", function (d) { return d.source.longitude * 10; })
                .attr("x2", function (d) { return d.target.latitude * 10; })
                .attr("y2", function (d) { return d.target.longitude * 10; });

            node.attr("cx", function (d) { return d.latitude * 10; })
                .attr("cy", function (d) { return d.longitude * 10; });
        });
    }
}