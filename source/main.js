// JavaScript source code

function Graph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {

        d3.json("draft_v1.json", parse_data);

    }

    function parse_data(error, data) {
        if (error) throw error;

        force = d3.layout.force()
            .charge(10)
            .linkDistance(200)
            .size([width, height]);

        svg = d3.select(id).append("svg")
            .attr("width", width)
            .attr("height", height);

        force
            .nodes(data.networks)
            .links(data.routes)
            .start();
                        

        link = svg.selectAll(".link")
            .data(data.routes)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", function (d) { return d.bandwidth / 100; })
            .on("click", line_mouse_click);


        link.append("title")
            .text(function (d) { return d.name; });

        node = svg.selectAll(".node")
            .data(data.networks)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .attr("fill", function(d) { return "red"; })
            .call(force.drag)
            .on("click", node_mouse_click);

        node.append("title")
            .text(function (d) {
                return d.name;
            });

        force.on("tick", function () {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("y2", function (d) { return d.target.y; })
                .attr("x2", function (d) { return d.target.x; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        });

        function node_mouse_click() {
            //alert("Node: " + d3.select(this).text());

            /* otevreni noveho okna - moznost otevreni okna s nactenyma hodnotama z flowmon
                                    window.open(this.href, "targetWindow",
                                                "toolbar=no, location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=SomeSize,height=SomeSize");
            */
            d3.select("#sub_graph").remove();
        }

        function line_mouse_click() {
            //alert("Link: " + d3.select(this).text());
            /*var sub_rectangle = d3.select(id).append("svg")//.load("data.html");
                .attr("x", this.getAttribute("x1"))
                .attr("y", this.getAttribute("y1"))
                .attr("width", 400)
                .attr("height", 400)
                .attr("style", "border: 1px solid black;")
                .attr("id", "sub_graph");
            */
            var sub_rectangle = d3.select(id).append("svg")//.load("data.html");
                .attr("viewBox", "0 100 200 300")
                .attr("width", 400)
                .attr("height", 400)
                .attr("style", "border: 1px solid black;")
                .attr("id", "sub_graph");
            var sub_graph = new Graph("#sub_graph", 400, 400).create_graph();
        }
    }
}