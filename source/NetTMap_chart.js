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

    // vytvori zalozky
    function create_tab() {
        tabs = d3.select("#" + id).append("ul").attr("class", "nav nav-tabs");
        tabs.append("li").attr("class", "active").append("a").attr("data-toggle", "tab").attr("href", "#traffic_chart").text("Traffic");
        tabs.append("li").append("a").attr("data-toggle", "tab").attr("href", "#profile_live").text("Profile live");
        tabs.append("li").append("a").attr("data-toggle", "tab").attr("href", "#device_info").text("Device info");
        // mozna by slo pridat interface, profiles

        contents = d3.select("#" + id).append("div").attr("class", "tab-content");
        contents.append("div").attr("id", "traffic_chart").attr("class", "tab-pane fade in active").append("p").attr("id", "traffic_chart_content").text("Loading ...");
        contents.append("div").attr("id", "device_info").attr("class", "tab-pane fade").append("p").attr("id", "device_info_content").text("Loading ...");
        contents.append("div").attr("id", "profile_live").attr("class", "tab-pane fade").append("p").attr("id", "profile_live_content").text("Loading ...");
    }

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
        d3.selectAll('#sub_graph').remove();
        d3.selectAll('#device_info_content').remove();
        d3.selectAll('#traffic_chart_content').remove();
        d3.selectAll('#profile_live_content').remove();
        create_tab();

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
                get_data_profile();
                get_data_sensor();
                get_data_traffic();
            },

            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#traffic_chart_content").remove();
                d3.selectAll("#device_info_content").remove();
                d3.selectAll("#profile_live_content").remove();
                d3.select('#traffic_chart').append("p").attr("id", "traffic_chart_content").text('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
                d3.select('#device_info').append("p").attr("id", "device_info_content").text('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
                d3.select('#profile_live').append("p").attr("id", "profile_live_content").text('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
                alert('Chyba: Z adresy "' + host + '" nelze ziskat pristupovy token.');
            },
        });
    }

    // vrati pocatecni casovy udaji zaznamu provozu ze sondy s ohledem na nastavenou konstantu obnovy
    function get_start_dateTime() {
        var refresh_time = null;
        if (typeof (Storage) !== "undefined") {
            refresh_time = sessionStorage.refresh_time;
        } else {
            alert("Local storage isn't support");
        }
        var start_time;
        if (refresh_time == null) // defaultni hodnota je jeden den
            start_time = new Date(new Date().setDate(new Date().getDate() - 1));
        else
            start_time = new Date(new Date() - refresh_time);
        return start_time.toJSON().slice(0, 10) + ' ' + start_time.toJSON().slice(11, 16);
    }

    // vrati casovy udaj pro posledni zaznam datam provozu ze sondy
    function get_end_dateTime() {
        return new Date().toJSON().slice(0, 10) + ' ' + new Date().toJSON().slice(11, 16);
    }

    function get_data_traffic() {
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
                    "from": get_start_dateTime(),
                    "to": get_end_dateTime(),
                    "profile": "live",// nazev profilu - geoJson
                    "chart": {
                        "measure": "traffic",
                        "protocol": 1
                    }
                })
            },
            success: function (msg) {
                // na obj je aplikovan json,ktery byl nacten
                parse_data_traffic(msg);
            },
            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#traffic_chart_content").remove();
                d3.select("#traffic_chart").append("p").attr("id", "traffic_chart_content").text('Error ' + err.code + ': "' + err.message + '" .');
            },
        });
    }

    function get_data_sensor() {
        var host = "";
        if (current_address != null)
            host = current_address;
        else
            host = nodes[current_item_index].address

        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fcc/device", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + current_token },
            success: function (msg) {
                // na obj je aplikovan json,ktery byl nacten
                parse_data_device(msg);
            },
            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#device_info_content").remove();
                d3.select("#device_info").append("p").attr("id", "device_info_content").text('Error ' + err.code + ': "' + err.message + '" .');
            },
        });
    }

    function get_data_profile() {
        var host = "";
        if (current_address != null)
            host = current_address;
        else
            host = nodes[current_item_index].address

        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fmc/profiles/id", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + current_token },
            data: { id: "live" },
            success: function (msg) {
                // na obj je aplikovan json,ktery byl nacten
                parse_data_profile(msg);
            },
            error: function (a, b, err) {
                console.log(err);
                d3.selectAll("#profile_live_content").remove();
                d3.select("#profile_live").append("p").attr("id", "profile_live_content").text('Error ' + err.code + ': "' + err.message + '" .');
            },
        });
    }

    function show_router_info() {
        d3.selectAll('#device_info_content').remove();
        var output = d3.select("#device_info").append("p").text("Zd se budou zobrazovat informace o routeru");
    }

    function show_link_info() {
        d3.selectAll("#device_info_content").remove();
        var output = d3.select("#device_info").append("p").text("Zd se budou zobrazovat informace o lince");
    }

    function formatSizeUnits(bytes) {
        if (bytes >= 1000000000) { bytes = (bytes / 1000000000).toFixed(2) + ' GB'; }
        else if (bytes >= 1000000) { bytes = (bytes / 1000000).toFixed(2) + ' MB'; }
        else if (bytes >= 1000) { bytes = (bytes / 1000).toFixed(2) + ' KB'; }
        else if (bytes > 1) { bytes = bytes + ' bytes'; }
        else if (bytes == 1) { bytes = bytes + ' byte'; }
        else { bytes = '0 byte'; }
        return bytes;
    }

    // parsuje a zobrazuje prichozi json data s informacemi o zarizeni
    function parse_data_device(data) {
        d3.selectAll("#device_info_content").remove();
        var info_table = d3.selectAll("#device_info").append("table").attr("id", "device_info_content").attr("class", "table borderless");

        var row1 = info_table.append("tr");
        row1.append("td").text("Device name: ");
        row1.append("td").text(data.deviceInfo.deviceName);

        row1 = info_table.append("tr");
        row1.append("td").text("Online time: ");
        row1.append("td").text(data.deviceInfo.onlineTime);

        row1 = info_table.append("tr");
        row1.append("td").text("Discs: ");
        if (data.deviceInfo.disks.length > 0)
            row1.append("td").text(data.deviceInfo.disks[0].name);
        else
            row1.append("td");
        for (var count = 1; count < data.deviceInfo.disks; count++) {
            row1 = info_table.append("tr");
            row1.append("td");
            row1.append("td").text(data.deviceInfo.disks[count].name);
        }

        row1 = info_table.append("tr");
        row1.append("td").text("RAM total: ");
        row1.append("td").text(formatSizeUnits(data.ramUsage.total));
        
        row1 = info_table.append("tr");
        row1.append("td").text("RAM usage: ");
        row1.append("td").text(formatSizeUnits(data.ramUsage.usage));

        row1 = info_table.append("tr");
        row1.append("td").text("System disc total: ");
        row1.append("td").text(formatSizeUnits(data.systemDiskUsage.total));
        
        row1 = info_table.append("tr");
        row1.append("td").text("System disc usage: ");
        row1.append("td").text(formatSizeUnits(data.systemDiskUsage.usage));

        row1 = info_table.append("tr");
        row1.append("td").text("Boot disc total: ");
        row1.append("td").text(formatSizeUnits(data.bootDiskUsage.total));
        
        row1 = info_table.append("tr");
        row1.append("td").text("Boot disc usage: ");
        row1.append("td").text(formatSizeUnits(data.bootDiskUsage.usage));

        row1 = info_table.append("tr");
        row1.append("td").text("Data disc total: ");
        row1.append("td").text(formatSizeUnits(data.dataDiskUsage.total));
        
        row1 = info_table.append("tr");
        row1.append("td").text("Data disc usage: ");
        row1.append("td").text(formatSizeUnits(data.dataDiskUsage.usage));

    }

    // parsuje a zobrazuje json data s provozem site
    function parse_data_traffic(data) {
        d3.selectAll("#traffic_chart_content").remove();
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
            var x = d3.time.scale.utc().domain([new Date(d3.min(x_data)), new Date(d3.max(x_data))])
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

            traffic_charts_content = d3.select('#traffic_chart')
                                    .append("svg")
                                    .attr("id", "traffic_chart_content")
                                    .attr("width", graph_width + margin.left + margin.right)
                                    .attr("height", graph_height + margin.top + margin.bottom)
                                    .append("g")
                                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            traffic_charts_content.append("text")
                                .attr("font-size", "20px")
                                .attr("transform", "translate(20, -10)")
                                .text(data[count_result].channel.name);

            var barGraph = traffic_charts_content.append("rect")
                        .attr("width", graph_width)
                        .attr("height", graph_height)
                        .style("fill", "white");

            var xGroupAxis = traffic_charts_content.append("g")
                                    .attr("class", "axis")
                                    .attr("transform", "translate(0," + graph_height + ")")
                                    .call(xAxis);

            var yGroupAxis = traffic_charts_content.append("g")
                                    .attr("class", "axis")
                                    .call(yAxis);

            var barWidth = graph_width / data[count_result].values.length;

            var bar = traffic_charts_content.selectAll("g")
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

    // parsuje a zobrazi json data o profile live ze sondy
    function parse_data_profile(data) {
        last_time = data.end;
        d3.selectAll("#profile_live_content").remove();
        d3.selectAll("#profile_live_content").remove();
        var info_table = d3.selectAll("#profile_live").append("table").attr("id", "profile_live_content").attr("class", "table borderless");

        var row1 = info_table.append("tr");
        row1.append("td").text("Device name: ");
        row1.append("td").text(data.name);

        row1 = info_table.append("tr");
        row1.append("td").text("Description: ");
        row1.append("td").text(data.description);

        row1 = info_table.append("tr");
        row1.append("td").text("Type: ");
        row1.append("td").text(data.type);

        row1 = info_table.append("tr");
        row1.append("td").text("Status: ");
        row1.append("td").text(data.status);

        row1 = info_table.append("tr");
        row1.append("td").text("End time: ");
        row1.append("td").text(data.end);
    }
}