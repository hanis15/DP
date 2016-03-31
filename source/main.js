// JavaScript source code

function Graph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {
        d3.json("json/brno_school.geo.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;

        force = d3.layout.force()
            .charge(10)
            .linkDistance(200)
            .size([width, height]);

        svg = d3.select(id).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "border: 1px solid black;");

        // prevod z geoJson do force reprezentace
        nodes = [];
        links = [];
        for (count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                nodes.push(data.features[count].properties);
            }
            else {
                links.push(data.features[count].properties);
            }
        }

        for (count = 0; count < links.length; count++) {
            for (n_count = 0; n_count < nodes.length; n_count++) {
                if (links[count].source == nodes[n_count].name)
                    links[count].source = n_count;
                if (links[count].target == nodes[n_count].name)
                    links[count].target = n_count;
            }
        }
        
        force
            .nodes(nodes)
            .links(links)
            .start();

        link = svg.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            //.style("stroke-width", function (d) { return d.bandwidth / 100; })
            .attr("title", function (d) { return d.name; })
            .attr("id", function (d) { return d.name; });

        node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .attr("fill", function(d) { return "red"; })
            .call(force.drag);

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