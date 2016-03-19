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

            var margin = { top: 40, right: 40, bottom: 40, left: 40 },
            graph_width = width - margin.left - margin.right,
            graph_height = height - margin.top - margin.bottom;


            // meritko osy x
            var x = d3.time.scale.utc()
                                .domain([new Date(d3.min(x_data)), new Date(d3.max(x_data))])
                                .range([0, width]);
            //meritko osy y
            var y = d3.scale.linear()
                            .domain([0, d3.max(y_data)])
                            .range([height, 0]);
            // osa x
            var xAxis = d3.svg.axis()
                            .scale(x)
                            .ticks(5)
                            .orient("bottom");
            // osa y
            var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left");

            var svgContainer = d3.select("#d3_graph")
                                 .attr("width", width + margin.left + margin.right)
                                 .attr("height", height + margin.top + margin.bottom)
                                 .append("g")
                                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svgContainer.append("rect")
                        .attr("width", width)
                        .attr("height", height)
                        .style("fill", "white");

            var xGroupAxis = svgContainer.append("g")
                                    .attr("class", "axis")
                                    .attr("transform", "translate(0," + height + ")")
                                    .call(xAxis);

            var yGroupAxis = svgContainer.append("g")
                                    .attr("class", "axis")
                                    .call(yAxis);

            var barWidth = width / json[3].values.length;

            var bar = svgContainer.selectAll("g")
                  .data(json[3].values)
                .enter().append("g")
                  .attr("transform", function (d, i) {
                      return "translate(" + i * barWidth + ",0)";
                  });

            bar.append("rect")
                .attr("y", function (d) {
                    return y(d[1]);
                })
                .attr("height", function (d) {
                    return height - y(d[1]);
                })
                .attr("width", barWidth - 1);

            bar.append("text")
                .attr("x", barWidth / 2)
                .attr("y", function (d) {
                    return y(d[1]) + 3;
                })
                .attr("dy", ".75em")
                .text(function (d) {
                    return d[1];
                });
        });

    }
}