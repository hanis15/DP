// JavaScript source code

function Graph(id, width, height) {
    var svg;
    this.create_graph = load_graph;
    this.define_style = define_style;
    this.set_data = nacti_data;

    // definovani css style
    function define_style() {
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = ".ui-tooltip, .qtip{"
                        + "position: absolute;"
                        + "left: -28000px;"
                        + "top: -28000px;"
                        + "display: none;"
                        + "max-width: 900px;"
                        + "min-width: 600px;"
                        + "font-size: 10.5px;"
                        + "line-height: 12px;"
                        + "}";
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function nacti_data(data) {
        var json_data = jQuery.parseJSON(data);

        svg.remove();
        new_graph(json_data);
    }

    function load_graph() {
        define_style();
        //d3.json("json/brno_school.geo.json", parse_data);
        d3.json("json/cz_city.geo.json", parse_data);
    }

    function parse_data(error, data) {
        if (error) throw error;

        new_graph(data);
    }


    function new_graph(data) {
        force = d3.layout.force()
            .charge(-400)       // zaporne hodnoty nastavuji jak se odpuzuji jednotlivy uzly
            .linkDistance(200)
            .size([width, height])
            .on("tick", tick)
            .on("end", function () {
                node.each(function (d) {
                    d.fixed = true;
                });
            });

        svg = d3.select(id)
            .style("width", width)
            .style("height", height)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "border: 1px solid black;")
            .on("click", explicitlyPosition);

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
            .style("stroke", "#9ecae1")
            .style("stroke-width", "1.5px")
            .attr("title", function (d) { return d.name; })
            .attr("id", function (d) { return d.name; });

        node_g = svg.selectAll("g.node")
            .data(nodes, function(d) { return d.name; });
            
        node = node_g.enter().append("g")
                             .attr("class", "node")
                             .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
                             .call(force.drag);

        node_c = node.append("circle")
            .attr("r", 20)
            .style("fill", "#eee");            

        node.append("image")
            .attr("xlink:href", function (d) { return (d.type_node == "R") ? "img/router.png" : "img/sensor.png" })
            .attr("x", function (d) { return -25; })
            .attr("y", function (d) { return -25; })
            .attr("height", 50)
            .attr("width", 50);

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

        function explicitlyPosition() {
            node_c.each(function (d) {
                d.x = 0;
                d.y = 0;
                d.fixed = false;
            });
            tick();
            node_c.each(function (d) {
                d.fixed = true;
            });
            force.resume();
        }

        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("y2", function (d) { return d.target.y; })
                .attr("x2", function (d) { return d.target.x; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; })
                .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }
    }
}