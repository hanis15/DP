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
    var history_interval = '86400000';

    function get_index_node_by_id(id) {
        for (var count = 0; count < nodes.length; count++) {
            if (nodes[count].id == id) return count;
        }
    }
    function get_index_link_by_id(id) {
        for (var count = 0; count < links.length; count++) {
            if (links[count].id == id) return count;
        }
    }

    // vytvori zalozky
    function create_tab() {
        tabs = d3.select("#" + id).append("ul").attr("class", "nav nav-tabs");
        if (current_type == 'L') {
            if (links[current_item_index].probe != '') { // linka + sonda
                tabs.append("li").attr("id", "traffic_chart_tab").attr("class", "active").append("a").attr("data-toggle", "tab").attr("href", "#traffic_chart").text("Traffic");
                tabs.append("li").attr("id", "device_info_tab").append("a").attr("data-toggle", "tab").attr("href", "#device_info").text("Link info");
                tabs.append("li").attr("id", "profile_live_tab").append("a").attr("data-toggle", "tab").attr("href", "#profile_live").text("Profile live");

                contents = d3.select("#" + id).append("div").attr("class", "tab-content");
                contents.append("div").attr("id", "traffic_chart").attr("class", "tab-pane fade in active").append("p").attr("id", "traffic_chart_content").text("Loading ...");
                contents.append("div").attr("id", "device_info").attr("class", "tab-pane fade ").append("p").attr("id", "device_info_content").text("Loading ...");
                contents.append("div").attr("id", "profile_live").attr("class", "tab-pane fade").append("p").attr("id", "profile_live_content").text("Loading ...");
            }
            else {
                tabs.append("li").attr("id", "device_info_tab").attr("class", "active").append("a").attr("data-toggle", "tab").attr("href", "#device_info").text("Link info");
                //tabs.append("li").attr("id", "traffic_chart_tab").append("a").attr("data-toggle", "tab").attr("href", "#traffic_chart").text("Traffic");
                //tabs.append("li").attr("id", "profile_live_tab").append("a").attr("data-toggle", "tab").attr("href", "#profile_live").text("Profile live");

                contents = d3.select("#" + id).append("div").attr("class", "tab-content");
                contents.append("div").attr("id", "device_info").attr("class", "tab-pane fade in active").append("p").attr("id", "device_info_content").text("Loading ...");
            }
        }
        else {
            if (nodes[current_item_index].type_node == "R") {
                tabs.append("li").attr("id", "device_info_tab").attr("class", "active").append("a").attr("data-toggle", "tab").attr("href", "#device_info").text("Router info");

                contents = d3.select("#" + id).append("div").attr("class", "tab-content");
                contents.append("div").attr("id", "device_info").attr("class", "tab-pane fade in active").append("p").attr("id", "device_info_content").text("Loading ...");
            }
            else {
                tabs.append("li").attr("id", "traffic_chart_tab").attr("class", "active").append("a").attr("data-toggle", "tab").attr("href", "#traffic_chart").text("Traffic");
                tabs.append("li").attr("id", "device_info_tab").append("a").attr("data-toggle", "tab").attr("href", "#device_info").text("NetFlow probe info");
                tabs.append("li").attr("id", "profile_live_tab").append("a").attr("data-toggle", "tab").attr("href", "#profile_live").text("Profile live");

                contents = d3.select("#" + id).append("div").attr("class", "tab-content");
                contents.append("div").attr("id", "traffic_chart").attr("class", "tab-pane fade in active").append("p").attr("id", "traffic_chart_content").text("Loading ...");
                contents.append("div").attr("id", "device_info").attr("class", "tab-pane fade ").append("p").attr("id", "device_info_content").text("Loading ...");
                contents.append("div").attr("id", "profile_live").attr("class", "tab-pane fade").append("p").attr("id", "profile_live_content").text("Loading ...");
            }
        }
        // mozna by slo pridat interface, profiles

    }

    function load_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            nodes = jQuery.parseJSON(sessionStorage.nodes);
            links = jQuery.parseJSON(sessionStorage.links);
            current_item_index = sessionStorage.current_item_index;
            current_type = sessionStorage.current_type;
            if ((sessionStorage.history_interval != null) && (sessionStorage.history_interval != "")) history_interval = sessionStorage.history_interval;
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
            else {
                current_node_index = current_item_index;
                if ((nodes[current_item_index].token != "") && (nodes[current_item_index].token != null)) {
                    get_data_profile();
                    get_data_sensor();
                    get_data_traffic();
                }
                else
                    get_token();
            }
        }
        else if (current_type == "L") { // jedna se o linku
            if (links[current_item_index].probe == "") // jedna se o linku mezi routery
                show_link_info(); // zobrazi info o lince
            else {  // najde uzel a zjisti token a adresu
                current_node_index = get_index_node_by_id(links[current_item_index].probe);
                current_address = nodes[current_node_index].hostname;
                if ((nodes[current_node_index].token != "") && (nodes[current_node_index].token != null)) {
                    get_data_profile();
                    get_data_sensor();
                    get_data_traffic();
                }
                else
                    get_token();                
            }
        }
    }

    // ziska token, pokud je definovana promenna current_address ziska token z teto adresy, jinak bere adresu z uzlu
    function get_token() {
        var host = "";
        if (current_address != null)
            host = current_address;
        else
            host = nodes[current_item_index].hostname;
        //var host = "collector-devel.ics.muni.cz";//"147.251.14.50";////"192.168.51.145";// collector-devel.ics.muni.cz
        $.ajax({
            type: "POST",
            url: "https://" + host + "/resources/oAuth/token",
            contentType: "application/x-www-form-urlencoded",
            data: {
                "username": "nettmap",// UCO
                "password": "N3tTM4p&h3sl0",// sekundarni heslo
                "client_id": "invea-tech",
                "grant_type": "password"
            },

            success: function (msg) {
                current_token = msg.access_token;
                nodes[current_node_index].token = msg.access_token;
                nodes[current_node_index].token_refresh = msg.refresh_token;
                save_local_variable();
                get_data_profile();
                get_data_sensor();
                get_data_traffic();
            },

            error: function (a, b, err) {
                // nutno osetrit pokud se vrati chyba 401 - token expired
                console.log(err);
                d3.selectAll("#traffic_chart_content").remove();
                d3.selectAll("#device_info_content").remove();
                d3.selectAll("#profile_live_content").remove();
                d3.select('#traffic_chart').append("p").attr("id", "traffic_chart_content").text("Error: From address '" + host + "' can't get access token.");
                d3.select('#device_info').append("p").attr("id", "device_info_content").text("Error: From address '" + host + "' can't get access token.");
                d3.select('#profile_live').append("p").attr("id", "profile_live_content").text("Error: From address '" + host + "' can't get access token.");
                alert("Error: From address '" + host + "' can't get access token.");
            },
        });
    }

    // vrati pocatecni casovy udaji zaznamu provozu ze sondy s ohledem na nastavenou konstantu obnovy
    function get_start_dateTime() {
        var start_time;
        if (history_interval == null) // defaultni hodnota je jeden den
            start_time = new Date(new Date().setDate(new Date().getDate() - 1));
        else
            start_time = new Date(new Date() - history_interval);
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
            host = nodes[current_item_index].hostname;

        if (nodes[current_node_index].token != "") current_token = nodes[current_node_index].token;

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
                        "protocol": 0
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
            host = nodes[current_item_index].hostname;

        if (nodes[current_node_index].token != "") current_token = nodes[current_node_index].token;

        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fcc/device", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + current_token },
            success: function (msg) {
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
            host = nodes[current_item_index].hostname;

        if (nodes[current_node_index].token != "") current_token = nodes[current_node_index].token;

        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fmc/profiles/id", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + current_token },
            data: { id: "live" },
            success: function (msg) {
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
        d3.selectAll("#traffic_chart_content").remove();
        var info_table = d3.selectAll("#traffic_chart").append("p").attr("id", "traffic_chart_content").text("No data traffic");

        d3.selectAll("#profile_live_content").remove();
        info_table = d3.selectAll("#profile_live").append("p").attr("id", "profile_live_content").text("No data for profile live");

        d3.selectAll("#device_info_content").remove();
        info_table = d3.selectAll("#device_info").append("table").attr("id", "device_info_content").attr("class", "table borderless");

        var row = info_table.append("tr");
        row.append("td").text("Router name: ");
        row.append("td").text(nodes[current_item_index].hostname);

        row = info_table.append("tr");
        row.append("td").text("Description: ");
        row.append("td").text(nodes[current_item_index].description);

        row = info_table.append("tr");
        row.append("td").text("Address: ");
        row.append("td").text(nodes[current_item_index].address);

        row = info_table.append("tr");
        row.append("td").text("Longitude: ");
        row.append("td").text(nodes[current_item_index].long);

        row = info_table.append("tr");
        row.append("td").text("Latitude: ");
        row.append("td").text(nodes[current_item_index].lat);
    }
    function show_link_info() {
        d3.selectAll("#traffic_chart_content").remove();
        var info_table = d3.selectAll("#traffic_chart").append("p").attr("id", "traffic_chart_content").text("No data traffic");

        d3.selectAll("#profile_live_content").remove();
        var info_table = d3.selectAll("#profile_live").append("p").attr("id", "profile_live_content").text("No data for profile live");

        d3.selectAll("#device_info_content").remove();
        var info_table = d3.selectAll("#device_info").append("table").attr("id", "device_info_content").attr("class", "table borderless");

        var row = info_table.append("tr");
        row.append("td").text("Link name: ");
        row.append("td").text(links[current_item_index].name);

        row = info_table.append("tr");
        row.append("td").text("Speed: ");
        row.append("td").text(links[current_item_index].speed);

        row = info_table.append("tr");
        row.append("td").text("Source: ");
        row.append("td").text(links[current_item_index].source);

        row = info_table.append("tr");
        row.append("td").text("Target: ");
        row.append("td").text(links[current_item_index].targer);

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
                if ((links[current_item_index].channel1 != data[count_result].channel.name) &&
                    (links[current_item_index].channel2 != data[count_result].channel.name))
                    continue;
            }

            var x_data = [];
            var y_data = [];
            for (var count = 0; count < data[count_result].values.length; count++) {
                x_data.push(data[count_result].values[count][0]);
                y_data.push((data[count_result].values[count][1] / 1000000).toFixed(2));
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
                            .ticks(6)
                            .orient("bottom");
            // osa y
            var yAxis = d3.svg.axis()
                            .scale(y)
                            .ticks(4)
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