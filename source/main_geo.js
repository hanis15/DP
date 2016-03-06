// JavaScript source code

function GeoGraph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {

        d3.json("geo.json", parse_data);

    }

    function parse_data(error, data) {
        if (error) throw error;

        force = d3.layout.force()
            //.charge(10)
            .linkDistance(200)
            .size([width, height]);

        svg = d3.select(id).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "border: 1px solid black;");

        force
            .nodes(data.networks)
            .links(data.routes)
            .start();

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
            .attr("cx", function (d) { return d.latitude; })
            .attr("cy", function (d) { return d.longitude; })
            .style("fill", function (d) { return d.name == "FI_MUNI" ? "red" : "green"; });
            //.call(force.drag);

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
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("y2", function (d) { return d.target.y; })
                .attr("x2", function (d) { return d.target.x; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        });
    }
}