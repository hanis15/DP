// JavaScript source code
var NetTMap_map = (function () {
    var graph_instance;

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create() {
        graph_instance = new mapTopo();
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



function mapTopo() {
    var id;
    var width;
    var height;
    var map_block;
    var color_spectrum_block;
    var color_spectrum_scale;
    var input_form;
    var zoom;
    var nodes = [];
    var links = [];
    var current_type;
    var current_item_index;
    var refresh_time = '0';
    var history_interval;
    this.create_map = load_graph;
    this.set_data = nacti_data;
    this.initialize = init_map;
    this.add_input_form = init_input_form;


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

    function init_map(i, w, h) {
        init_local_variables();
        color_spectrum_scale = d3.scale.log().domain([0.1, 100]).range(["green", "red"]);
        id = i;
        width = w;
        height = h;

        if (map_block != null) map_block.remove();
        if (color_spectrum_block != null) color_spectrum_block.remove();
        init_input_form();
        d3.select('#' + id).append("div").attr("id", "map_canvas");
        // nastaveni velikosti
        $("#map_canvas").height(height);
        $("#map_canvas").width(width);
        new_map(null);
    }

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

    function nacti_data(data) {
        var json_data = jQuery.parseJSON(data);

        map_block.remove();
        new_map(json_data);
    }

    // vytvori mapu
    function load_graph() {       
        //d3.json("json/test.geo.json", parse_data);
        new_map(null);
    }

    function parse_data(error, data) {
        if (error) throw error;
        
        new_map(data);
    }

    function new_map(data) {
        if (data == null) {
            map_block = L.map("map_canvas").setView([0, 0], 1);
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map_block);
            return;
        }

        var x_data = [];
        var y_data = [];
        nodes = [];
        links = [];
        for (var count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                nodes.push(data.features[count].properties);
                x_data.push(data.features[count].geometry.coordinates[0]);
                y_data.push(data.features[count].geometry.coordinates[1]);
            }
            else
                links.push(data.features[count].properties);
        }

        for (count = 0; count < links.length; count++) {
            links[count].index = count;
            links[count].inPair = 'L';
        }

        // nastaveni typu prohnuti linky
        set_type_path();


        // zobrazeni mapy s ohledem na souradnice bodu
        zoom = 7;
        error = null;
        map_block = L.map('map_canvas').setView([d3.median(y_data), d3.median(x_data)], zoom);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map_block);

        var myStyle1 = {
            "weight": "4",
            "color": "#6f00ff",
            "opacity": "1"
        };

        var myStyle2 = {
            "weight": "6",
            "color": "#66cdaa",
            "opacity": "1"
        };
        var myStyle3 = {
            "weight": "8",
            "color": "#ffff66",
            "opacity": "1"
        };
        var myStyle4 = {
            "weight": "10",
            "color": "#ff4444",
            "opacity": "1"
        };
        var myStyle5 = {
            "weight": "12",
            "color": "#000000",
            "opacity": "1"
        };

        var geoJsonLayer = L.geoJson(data.features, {
            pointToLayer: function (feature, latlng) {
                var smallIcon = L.icon({
                    iconSize: [40, 40],
                    id: "node_" + function () {
                        for (var count = 0; count < nodes.length; count++) {
                            if (nodes[count].name == feature.properties.name)
                                return count;
                        }
                    },
                    iconUrl: (feature.properties.type_node == "R") ? "img/router.svg" : "img/sensor.svg"
                });

                return L.marker(latlng, { icon: smallIcon });
            },
            style: function (feature, latlng) {
                if (feature.geometry.type == "LineString") {
                    switch (feature.properties.speed) {
                        case "100": return myStyle1;
                        case "1000": return myStyle2;
                        case "10000": return myStyle3;
                        case "40000": return myStyle4;
                        case "100000": return myStyle5;
                    }
                }
            },
            onEachFeature: function (feature, layer) {
                var popupOption = {
                    maxWidth: 640,
                    minWidth: 600,

                };

                layer.bindPopup('<iframe height="380" width="640" src="template/data.html" frameBorder="0" />', popupOption);
            }
        }).addTo(map_block);

        geoJsonLayer.eachLayer(function (layer) {
            if (layer.feature.geometry.type == 'LineString')
                layer._path.id = 'line_' + layer.feature.properties.index;
        });

        save_local_variable();
        load_global_setting();

        geoJsonLayer.on("popupclose", function (e) {
            //alert("close");
            load_local_variable();
        });

        geoJsonLayer.on("popupopen", function (e) {
            // najdu odpovidajici linku pro aktualni feature
            if (e.popup._source.feature.geometry.type == "LineString") {
                current_type = 'L';
                current_item_index = e.popup._source.feature.properties.index;
            }
            else {
                current_type = 'N';
                for (var count = 0; count < nodes.length; count++) {
                    if (e.popup._source.feature.properties.name == nodes[count].name) {
                        current_item_index = count;
                        break;
                    }
                }
            }
            save_local_variable();
        });

        function set_type_path() {
            for (var count = 0; count < links.length; count++) {
                for (var i_count = count + 1; i_count < links.length; i_count++) {
                    if (links[count].channel == links[i_count].channel) links[count].inPair = 'R';
                }
            }
        }

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
                    //update_last_time_update(data[count_result].values[0][0]);
                }
            }
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


}