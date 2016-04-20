// JavaScript source code
var NetTMap_graph = (function () {
    var graph_instance;

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create() {
        graph_instance = new mapGraph();
        return graph_instance;
    }

    return {
        getInstance: function () {
            if (graph_instance == null)
                graph_instance = create();
            return graph_instance;
        }
    };
})();

function mapGraph() {
    var id;
    var height;
    var width;
    var graph_block;
    var color_spectrum_block;
    var color_spectrum_scale;
    var input_form;
    var nodes = [];
    var links = [];
    var current_type;
    var current_item_index;
    var refresh_time = '0';
    var last_time_update; // posledni cas refresh
    this.create_graph = load_graph;
    this.set_data = nacti_data;
    this.load_change = load_local_variable;
    this.initialize = init_graph;
    this.add_input_form = init_input_form;

    // vlozi do stranky formular pro vlozeni souboru s geoJson obsahem
    function init_input_form() {
        default_input_form = d3.select('#' + id).append("table").style("width", width + 'px');
        row1 = default_input_form.append("tr");
        row1.append("td").attr("align", "left").append("input")
                            .attr("type", "file")
                            .attr("id", "input_geo_json_file")
                            .attr("class", "btn-primary");
                            

        refresh_time_form = row1.append("td").attr("align", "right").append("select").style("width", "150px")
                            .attr("id", "refresh_time_input").attr("name", "refresh_time_input");

        var text = document.createTextNode('Refresh time: ');
        var child = document.getElementById('refresh_time_input');
        child.parentNode.insertBefore(text, child);
        refresh_time_form.append("option").attr("value", "0").text("Doesn't refreshed");
        refresh_time_form.append("option").attr("value", "30000").text("30 seconds");
        refresh_time_form.append("option").attr("value", "60000").text("1 minute");
        refresh_time_form.append("option").attr("value", "300000").text("5 minutes");
        refresh_time_form.append("option").attr("value", "600000").text("10 minutes");
        document.getElementById("refresh_time_input").value = "300000";

        history_time_select = row1.append("td").attr("align", "right").append("select").style("width", "120px")
                            .attr("id", "history_time_input").attr("name", "history_time_input");

        var text = document.createTextNode('History interval: ');
        var child = document.getElementById('history_time_input');
        child.parentNode.insertBefore(text, child);
        history_time_select.append("option").attr("value", "86400000").text("1 day");
        history_time_select.append("option").attr("value", "43200000").text("12 hours");

        load_global_setting();

        document.getElementById('refresh_time_input')
                .addEventListener('change', save_global_setting, false);
        document.getElementById('history_time_input')
        .addEventListener('change', save_global_setting, false);

        document.getElementById('input_geo_json_file')
        .addEventListener('change', readSingleFile, false);
    }

    function save_global_setting(e) {
        if (typeof (Storage) !== "undefined") {
            refresh_time = sessionStorage.refresh_time = document.getElementById("refresh_time_input").value;
            if (refresh_time == "0")
                window.clearTimeout();
            else
                window.setTimeout(refresh_links, refresh_time);
            sessionStorage.history_interval = document.getElementById("history_time_input").value;
       } else {
            alert("Local storage isn't support");
        }
    }

    function load_global_setting(e) {
        if (typeof (Storage) !== "undefined") {
            if (sessionStorage.refresh_time != null) {
                refresh_time = document.getElementById("refresh_time_input").value = sessionStorage.refresh_time;
                if ((refresh_time == "0") || (refresh_time == null))
                    window.clearTimeout();
                else
                    window.setTimeout(refresh_links, refresh_time);
            }
            if (sessionStorage.history_interval != null) document.getElementById("history_time_input").value = sessionStorage.history_interval;
        } else {
            alert("Local storage isn't support");
        }
    }

    // nacteni GEOJSON
    function readSingleFile(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            var contents = e.target.result;
            nacti_data(contents);
        };
        reader.readAsText(file);
    }
    
    function init_graph(i, w, h) {
        init_local_variables();
        id = i;
        width = w;
        height = h;
        color_spectrum_scale = d3.scale.log().domain([0.1, 100]).range(["green", "red"]);

        if (graph_block != null) graph_block.remove();
        if (color_spectrum_block != null) color_spectrum_block.remove();
        if (input_form != null) input_form.remove();
        init_input_form();
        new_graph(null);
    }

    function init_local_variables() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = "";
            sessionStorage.links = "";
            sessionStorage.curr_link_index = "";
        } else {
            alert("Local storage isn't support");
        }

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
            sessionStorage.links = JSON.stringify(links);
            sessionStorage.current_type = current_type;
            sessionStorage.current_item_index = current_item_index;
        } else {
            alert("Local storage isn't support");
        }

    }


    // vykresleni vzorniku pro rychlost
    function add_color_spectrum() {
        color_spectrum_block = d3.select('#' + id).append("div").attr("id", "color_palete_spectrum");

        color_spectrum = color_spectrum_block.attr("align", "center").append("svg");

        color_spectrum.append("rect")
                      .attr("class", "color_spectrum")
                      .style("fill", "#6f00ff");

        color_spectrum.append("rect")
                      .attr("x", "30")
                      .attr("class", "color_spectrum")
                      .style("fill", "#66cdaa");

        color_spectrum.append("rect")
                      .attr("x", "60")
                      .attr("class", "color_spectrum")
                      .style("fill", "#ffff66");

        color_spectrum.append("rect")
                      .attr("x", "90")
                      .attr("class", "color_spectrum")
                      .style("fill", "#ff4444");

        color_spectrum.append("rect")
                      .attr("x", "120")
                      .attr("class", "color_spectrum")
                      .style("fill", "#000000");
    }

    function nacti_data(data) {
        init_local_variables();
        var json_data = jQuery.parseJSON(data);


        if (graph_block != null) graph_block.remove();
        if (color_spectrum_block != null) color_spectrum_block.remove();
        new_graph(json_data);
    }

    function load_graph() {
        //d3.json("json/brno_school.geo.json", parse_data);
        //d3.json("json/cz_city.geo.json", parse_data);
        parse_data("");
    }

    function parse_data(error, data) {
        if (error) throw error;

        new_graph(data);
    }

    function new_graph(data) {
        force = d3.layout.force()
            .charge(-400)       // zaporne hodnoty nastavuji jak se odpuzuji jednotlivy uzly
            .linkDistance(200)
            .gravity(0.05)
            .size([width, height])
            .on("tick", tick)
            .on("end", function () {
                node.each(function (d) {
                    d.fixed = true;
                });
            });

        graph_block = d3.select('#' + id)
            .style("width", width)
            .style("height", height)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "border: 1px solid black;")
            .on("click", explicitlyPosition);

        add_color_spectrum();

        // pokud se pouze inicializuje zobrazeni
        if (data == null) return;

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
        
        for (count = 0; count < links.length; count++) {
            links[count].index = count;
            links[count].inPair = 'L';
        }

        // nastaveni typu prohnuti linky
        set_type_path();

        for (count = 0; count < nodes.length; count++) 
            nodes[count].index = count;

        force
            .nodes(nodes)
            .links(links)
            .start();

        link = graph_block.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .style("fill", "white")
            .style("stroke", "#000000")/*function (d) {
                switch (d.speed) {
                    case "100": return "#6f00ff";
                    case "1000": return "#66cdaa";
                    case "10000": return "#ffff66";
                    case "40000": return "#ff4444";
                    case "100000": return "#000000";
                }
            })*/
            .style("stroke-width", "6px")/*function (d) {
                switch (d.speed) {
                    case "100": return "2px";
                    case "1000": return "4px";
                    case "10000": return "6px";
                    case "40000": return "8px";
                    case "100000": return "10px";
                }
            })*/
            .attr("title", function (d) { return d.name; })
            .attr("id", function (d) { return "link_" + d.index; });

        node_g = graph_block.selectAll("g.node")
            .data(nodes, function (d) { return d.name; });
            
        node = node_g.enter().append("g")
                             .attr("class", "node")
                             .attr("id", function (d) { return "node_" + d.index; })
                             .attr("title", function (d) { return d.name; })
                             .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
                             .call(force.drag);

        node_c = node.append("circle")
            .attr("r", 20)
            .style("fill", "#eee");            

        node.append("image")
            .attr("xlink:href", function (d) { return (d.type_node == "R") ? "img/router.svg" : "img/sensor.svg" })
            .attr("x", function (d) { return -25; })
            .attr("y", function (d) { return -25; })
            .attr("height", 50)
            .attr("width", 50);


        $('.link, .node').qtip({
            content: {
                button: 'Close',
                title: function (event, api) {
                    var title = api.elements.target.attr("title");
                    if (api.elements.target.attr("class") == "node") {
                        current_type = "N";
                        for (var count = 0; count < nodes.length; count++)
                            if (nodes[count].name == api.elements.target.attr("title")) {
                                current_item_index = count;
                                break;
                            }
                    }
                    else {
                        current_type = "L";
                        current_item_index = api.elements.target.attr("id").split('_')[1];
                    }
                    save_local_variable();
                    return title;
                },
                text: $('<iframe height="380" width="640" src="template/data.html" frameborder="0" />')
            },
            show: 'click',
            hide: 'unfocus',
            position: {
                my: 'top left',  // Position my top left...
                at: 'bottom center', // at the bottom right of...
                adjust: {
                    screen: true
                }
            },
            style: {
                classes: 'qtip-bootstrap',
                width: 660,
                height: 430
            },
            events: {
                toggle: function (event, api) {
                    if (event.type == 'tooltiphide')
                        load_local_variable();
                }
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

        function set_type_path() {
            for (var count = 0; count < links.length; count++) {
                for (var i_count = count + 1; i_count < links.length; i_count++) {
                    if (links[count].channel == links[i_count].channel) links[count].inPair = 'R';
                }
            }
        }

        function tick() {
            link.attr("d", function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = 0;
                if (d.node != '')
                    dr = Math.sqrt((dx * dx + dy * dy) * 10);

                if (d.inPair == 'R')
                    p = "M" + d.source.x + "," + d.source.y +
                        "A" + dr + "," + dr + " 0 0 1," + d.target.x + "," + d.target.y +
                        "A" + dr + "," + dr + " 0 0 1," + d.source.x + "," + d.source.y;
                else
                    p = "M" + d.source.x + "," + d.source.y +
                        "A" + dr + "," + dr + " 1 0 0," + d.target.x + "," + d.target.y +
                        "A" + dr + "," + dr + " 1 0 0," + d.source.x + "," + d.source.y;

                return p;
            });

            node.attr("cx", function (d) { return d.x; })
                 .attr("cy", function (d) { return d.y; })
                 .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }

        /*
        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("y2", function (d) { return d.target.y; })
                .attr("x2", function (d) { return d.target.x; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; })
                .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }
        */
        load_global_setting();
    }

    function refresh_links() {
        load_local_variable();
        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'R') continue;

            // pokud existuje token, provede se pouze nacteni dat
            if (nodes[count].token == null)
                get_token(count);
            else
                get_data_traffic(nodes[count].token, count);
        }
    }

    // provede update linky podle ziskanych dat
    function update_link(link_index, data) {
        console.log("update channel: " + links[link_index].channel + ', data: ' + data);
        d3.select("#link_" + link_index).style("stroke", function (d) {
            var result = (links[d.index].speed * 1024) / data;
            console.log('result: ' + result * 100);
            return color_spectrum_scale(result * 100);
        })
    }

    function get_token(node_index) {
        var host = nodes[node_index].address
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
                token = msg.access_token;
                nodes[node_index].token = msg.access_token;
                get_data_traffic(token, node_index);
            },

            error: function (a, b, err) {
                console.log(err);
            },
        });
    }

    // vrati pocatecni casovy udaji zaznamu provozu ze sondy s ohledem na nastavenou konstantu obnovy
    function get_start_dateTime() {
        var refresh_time = null;
        var start_time = new Date(new Date() - 600000); // default hodnota = 10 minut
        return start_time.toJSON().slice(0, 10) + ' ' + start_time.toJSON().slice(11, 16);
    }

    // vrati casovy udaj pro posledni zaznam datam provozu ze sondy
    function get_end_dateTime() {
        return new Date().toJSON().slice(0, 10) + ' ' + new Date().toJSON().slice(11, 16);
    }

    function get_data_traffic(token, node_index) {
        var host = nodes[node_index].address;
        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fmc/analysis/chart", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + token },
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
                parse_data_traffic(msg, node_index);
            },
            error: function (a, b, err) {
                console.log(err);
            },
        });
    }

    // provede update labelu s poslednim update refresh
    function update_last_time_update(time) {
        console.log(new Date(time));
    }

    function parse_data_traffic(data, node_index) {
        for (var count = 0; count < links.length; count++) {
            if (nodes[node_index].name == links[count].node) {
                for (var count_result = 0; count_result < data.length; count_result++) {
                    // preskocim channels kterych se to netyka
                    if (links[count].channel != data[count_result].channel.name)
                        continue;

                    // aktualni data = stav linky
                    //var x_data = data[count_result].values[0][0];
                    update_link(count, data[count_result].values[0][1]);
                    update_last_time_update(data[count_result].values[0][0]);
                }
            }
        }
    }
}