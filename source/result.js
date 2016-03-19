// JavaScript source code

function Graph(id, width, height) {
    this.create_graph = load_graph;

    function load_graph() {

        d3.json("Flowmon/example_result.json", parse_data);

    }

    function parse_data(error, data) {
        if (error) throw error;

        d3.json("Flowmon/example_result.json", function (json) {
            var x_data = [];
            var y_data = [];
            for (var count = 0; count < json[3].values.length; count++) {
                x_data.push(json[3].values[count][0]);
                y_data.push(json[3].values[count][1]);
            }

            var margin = { top: 40, right: 40, bottom: 40, left: 60 },
            graph_width = width - margin.left - margin.right,
            graph_height = height - margin.top - margin.bottom;


            // meritko osy x
            var x = d3.time.scale.utc()
                                .domain([new Date(d3.min(x_data)), new Date(d3.max(x_data))])
                                .range([0, graph_width]);
            //meritko osy y
            var y = d3.scale.linear()
                            .domain([0, d3.max(y_data)])
                            .range([graph_height, 0]);
            // osa x
            var xAxis = d3.svg.axis()
                            .scale(x)
                            .ticks(8)
                            .orient("bottom");
            // osa y
            var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left");

            var svgContainer = d3.select("#d3_graph")
                                 .attr("width", graph_width + margin.left + margin.right)
                                 .attr("height", graph_height + margin.top + margin.bottom)
                                 .append("g")
                                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svgContainer.append("text")
                                .attr("font-size", "20px")
                                .attr("transform", "translate(20, -10)")
                                .text(json[3].channel.name);

            var barGraph = svgContainer.append("rect")
                        .attr("width", graph_width)
                        .attr("height", graph_height)
                        .style("fill", "white");

            var xGroupAxis = svgContainer.append("g")
                                    .attr("class", "axis")
                                    .attr("transform", "translate(0," + graph_height + ")")
                                    .call(xAxis);

            var yGroupAxis = svgContainer.append("g")
                                    .attr("class", "axis")
                                    .call(yAxis);

            var barWidth = graph_width / json[3].values.length;

            var bar = svgContainer.selectAll("g")
                  .data(y_data)
                .enter().append("g")
                  .attr("transform", function (d, i) { return "translate(" + i * barWidth + ",0)"; });

            bar.append("rect")
                .attr("y", function (d) { return y(d); })
                .attr("height", function (d) { return graph_height - y(d); })
                .attr("title", function (d) { return d; })
                .attr("width", barWidth)
                .attr("class", "bar");

            $(".bar").qtip({
                content: {
                    text: function (event, api) {
                        return api.elements.target.attr("title");
                    },
                },
                show: { solo: true },
                position: {
                    my: 'left center',
                    at: 'right center',
                    adjust: {
                        screen: true
                    }
                },
                style: 'qtip-wiki'
            });
        });

    }
}