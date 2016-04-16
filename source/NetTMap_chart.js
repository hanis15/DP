// JavaScript source code

function NetTMap_chart(id, width, height) {
    this.create_graph = load_graph;
    var nodes = [];
    var links = [];
    var current_type;
    var current_item_index;
    var current_address;
    var current_token;
    var current_node_index; // pokud se jedna o linku, musim najit sondu

    function load_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            nodes = jQuery.parseJSON(sessionStorage.nodes);
            links = jQuery.parseJSON(sessionStorage.links);
            current_item_index = sessionStorage.current_item_index;
            current_type = sessionStorage.current_type;
        } else {
            alert("Local storage isn't support");
        }
    }

    function save_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
        } else {
            alert("Local storage isn't support");
        }
    }

    function load_graph() {
        load_local_variable();
        d3.selectAll("#sub_graph").remove();
        d3.select(id).append("p").attr("id", "sub_graph").text("Nacitam data ...");

        // ziska token
        if (current_type == "N") {
            if (nodes[current_item_index].type_node == "R")
                show_router_info();
            else
                get_token();
        }
        else if (current_type == "L") { // jedna se o linku
            if (links[current_item_index].node == "") // jedna se o linku mezi routery
                show_link_info(); // zobrazi info o lince
            else {  // najde uzel a zjisti token a adresu
                for (var count = 0; count < nodes.length; count++) {
                    if (nodes[count].name == links[current_item_index].node) {
                        current_address = nodes[count].address;
                        get_token();
                        break;
                    }
                }
            }
        }
    }

    // ziska token, pokud je definovana promenna current_address ziska token z teto adresy, jinak bere adresu z uzlu
    function get_token() {
        var host = "";
        if (current_address != null)
            host = current_address;
        else
            host = nodes[current_item_index].address
        //var host = "collector-devel.ics.muni.cz";//"147.251.14.50";////"192.168.51.145";// collector-devel.ics.muni.cz
        $.ajax({
            type: "POST",
            url: "https://" + host + "/resources/oAuth/token",
            contentType: "application/x-www-form-urlencoded",
            data: {
                "username": "rest",// UCO
                "password": "r3st&ful",// sekundarni heslo
                "client_id": "invea-tech",
                "grant_type": "password"
            },

            success: function (msg) {
                current_token = msg.access_token;
                //save_local_variable();
                get_data();
            },

            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#sub_graph").remove();
                d3.select(id).append("p").attr("id", "sub_graph").text('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
                alert('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
            },
        });
    }

    function get_data() {
        var host = "";
        if (current_address != null)
            host = current_address;
        else
            host = nodes[current_item_index].address

        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fmc/analysis/chart", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + current_token },
            data: {
                search: JSON.stringify({
                    "from": "2016-03-04 00:05",
                    "to": "2016-03-04 14:20",
                    "profile": "live",// nazev profilu - geoJson
                    "chart": {
                        "measure": "traffic",
                        "protocol": 1
                    }
                })
            },
            success: function (msg) {
                // na obj je aplikovan json,ktery byl nacten
                parse_data(msg);
            },
            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#sub_graph").remove();
                d3.select(id).append("p").attr("id", "sub_graph").text('Chyba ' + err.code + ': "' + err.message + '" .');
            },
        });
    }

    function show_router_info() {
        d3.selectAll("#sub_graph").remove();
        var output = d3.select(id).append("p").attr("id", "sub_graph").text("Zde se budou zobrazovat informace o routeru");
    }

    function show_link_info() {
        d3.selectAll("#sub_graph").remove();
        var output = d3.select(id).append("p").attr("id", "sub_graph").text("Zd se budou zobrazovat informace o lince");
    }

    function parse_data(data) {
        d3.selectAll("#sub_graph").remove();
        for (var count_result = 0; count_result < data.length; count_result++) {
            if (current_type == 'L') {
                if ((links[current_item_index].source_port != data[count_result].channel.name) &&
                    (links[current_item_index].target_port != data[count_result].channel.name)) 
                    continue;
            }

            var x_data = [];
            var y_data = [];
            for (var count = 0; count < data[count_result].values.length; count++) {
                x_data.push(data[count_result].values[count][0]);
                y_data.push(data[count_result].values[count][1]);
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

            var svgContainer = d3.select(id)
                                    .append("svg")
                                    .attr("id", "sub_graph")
                                    .attr("width", graph_width + margin.left + margin.right)
                                    .attr("height", graph_height + margin.top + margin.bottom)
                                    .append("g")
                                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svgContainer.append("text")
                                .attr("font-size", "20px")
                                .attr("transform", "translate(20, -10)")
                                .text(data[count_result].channel.name);

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

            var barWidth = graph_width / data[count_result].values.length;

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
                style: 'dark'
            });
        }
    }
}