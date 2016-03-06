// JavaScript source code

var popupWindow = null;
function Popup(status, url) {
    if (status != 0) {
        if (popup != null) popup.focus();
        else {
            var popup = open(url, "popups", "width=800,height=400");
            popupWindow = popup;
        }
    }
    else {
        if (popupWindow != null) {
            popupWindow.close();
        }
    }
}

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
            .on("mouseover", line_mouse_over)
            .on("mouseout", line_mouse_out);


        link.append("title")
            .text(function (d) { return d.name; });

        node = svg.selectAll(".node")
            .data(data.networks)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 20)
            .attr("fill", function(d) { return "red"; })
            .call(force.drag);

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

        function line_mouse_out() {
            Popup(0);
        }

        function line_mouse_over() {
            Popup(1, "/subGraph.html");
        }
    }
}