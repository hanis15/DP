/* NetTMap library
 * Paremter
 */
/*
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
*/
function NetTMap() {
    var id;                                 // id elementu v HTML ve kterem se ma graf vykreslit
    var height;                             // vyska elementu
    var width;                              // sirka elementu
    var main_block;                         // blok ve kterem je vykreslen samotny graf
    var input_form;                         // hlavicka stranky - zobrazuje se nad grafem
    var color_spectrum_block;               // paticka stranky - zobrazuje se pod grafem
    var color_spectrum_scale;               // barevna skala pro zobrazeni vytizeni linky
    var nodes = [];                         // pole vsech nactenych uzlu
    var nodes_count;                        // citac uzlu - pouziva se pro jednoznacnou identifikaci uzlu
    var links = [];                         // pole vsech nactenych linek
    var links_count;                        // citac linek - pouziva se pro jednoznacnou identifikaci linek
    var nodes_feature = [];                 // geoJson uzlu
    var links_feature = [];                 // geoJson linek
    var current_type;                       // urcuje typ zobrazovanych dat v popup ('L' = linka, 'N' = uzel)
    var current_item_index;                 // index prenaseny do popup, urcuje index v danem poli
    var refresh_time = '0';                 // interval po kterem se maji update stavu linek
    var history_interval;
    var last_time_update;                   // posledni cas refresh

    var path_hw_type = 'probe_type.json'; // cesta k souboru s typem hardware sond

    var type_visual_data;                   // uchovava typ zobrazeneho grafu ('map' = leaflet mapa, 'graph' = d3 graf, 'setting' = nastaveni zobrazeni)

    var zoom;                               // urcuje uroven zoom na mape
    var raw_json = '';                      // nezpracovany obsah souboru
// ------------------------------------------------------------------------------------------------------------
    // verejne funkce
    this.initialize = init_graph;
    
    // inicializuje box pro zobrazeni grafu / mapy
    function init_graph(i, type, w, h) {
        load_local_variable();
        id = i;
        if (typeof (w) === 'undefined')
            width = window.innerWidth;
        else
            width = w;
        if (typeof (h) === 'undefined') {
            height = window.innerHeight - $('.navbar').height();
            if ($('.navbar-inner').height() == null)
                height -= $('.navbar-inner').height();
        }
        else
            height = h;
        //color_spectrum_scale = d3.scale.log().domain([0.1, 100]).range(["green", "red"]);
        color_spectrum_scale = d3.scale.linear().domain([0.1, 100]).range(["green", "red"]);

        if (main_block != null) main_block.remove();

        //d3.select('#' + id).append("p").attr("align", "right").attr("id", "last_refresh_time_label").text("Last refresh: ---");

        if (type.toLowerCase() == 'graph') {
            type_visual_data = type.toLowerCase();
            new_graph();
        }
        else if (type.toLowerCase() == 'map') {
            type_visual_data = type.toLowerCase();
            d3.select('#' + id).append("div").attr("id", "map_canvas");
            // nastaveni velikosti
            $("#map_canvas").height(height);
            $("#map_canvas").width(width);
            new_map();
        }
        else if (type.toLowerCase() == 'setting') {
            type_visual_data = type.toLowerCase();
            new_setting();
        }
        else if ((type.toLowerCase() == 'configure') || (type.toLowerCase() == 'configure-probe')) { 
            type_visual_data = type.toLowerCase();
            new_configure_file();
        }
        else {
            console.log("Error: Wrong parameter 'type'.");
        }
    }

// ------------------------------------------------------------------------------------------------------------
    // provede update labelu s poslednim update time refresh
    function update_last_time_update(time) {
        console.log(new Date(time));
        var curr_time = new Date(time);
        d3.select('#last_refresh_time_label').text("Last refresh: "
                    + ((curr_time.getHours() < 10) ? '0' + curr_time.getHours() : curr_time.getHours())
                    + ':'
                    + ((curr_time.getMinutes() < 10) ? '0' + curr_time.getMinutes() : curr_time.getMinutes())
                    + ':' + curr_time.getSeconds());
    }

    // vrati pocatecni casovy udaji zaznamu provozu ze sondy s ohledem na nastavenou konstantu obnovy
    function get_start_dateTime() {
        var refresh_time = null;
        var start_time = new Date(new Date() - 600000); // default hodnota = 10 minut
        console.log("Start: " + start_time.toJSON().slice(0, 10) + ' ' + start_time.toJSON().slice(11, 16));
        return start_time.toJSON().slice(0, 10) + ' ' + start_time.toJSON().slice(11, 16);
    }
    // vrati casovy udaj pro posledni zaznam datam provozu ze sondy
    function get_end_dateTime() {
        console.log("End: " + new Date().toJSON().slice(0, 10) + ' ' + new Date().toJSON().slice(11, 16));
        return new Date().toJSON().slice(0, 10) + ' ' + new Date().toJSON().slice(11, 16);
    }

    // ziska z adresy v uzlu pristupovy token
    function get_token(node_index) {
        var host = nodes[node_index].address
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
                nodes[node_index].token_refresh = msg.refresh_token;
                save_local_variable();
                get_data_traffic(token, node_index);
            },

            error: function (a, b, err) {
                console.log(err);
            },
        });
    }
    // ziska data o provozu
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
                        "protocol": 0
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
    // ziska aktualni data pro dany uzel - refresh
    function parse_data_traffic(data, node_index) {
        for (var count = 0; count < links.length; count++) {
            if (nodes[node_index].name == links[count].node) {
                for (var count_result = 0; count_result < data.length; count_result++) {
                    // preskocim channels kterych se to netyka
                    if (links[count].source_channel != data[count_result].channel.name)
                        continue;

                    // aktualni data = stav linky
                    //var x_data = data[count_result].values[0][0];
                    update_link(count, data[count_result].values[data[count_result].values.length - 1][1]);
                    update_last_time_update(data[count_result].values[data[count_result].values.length - 1][0]);
                }
            }
        }
    }

    // projde vsechny uzly a provede refresh dat - refresh
    function refresh_links() {
        for (var count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'R') continue;

            // pokud existuje token, provede se pouze nacteni dat
            if ((nodes[count].token == null) || (nodes[count].token == ""))
                get_token(count);
            else
                get_data_traffic(nodes[count].token, count);
        }
        if (refresh_time != "0") window.setTimeout(refresh_links, refresh_time);
    }
    // provede update linky podle ziskanych dat - refresh
    function update_link(link_index, data) {
        console.log("index: " + link_index + ', data: ' + data);
        var result;
        result = (links[link_index].speed) / data;
        console.log('result: ' + result * 100);

        d3.select("#link_" + link_index).attr("stroke", color_spectrum_scale(result * 100))
    }
// ------------------------------------------------------------------------------------------------------------
    // funkce pro zobrazeni grafu = NetTMap GRAPH
    
    // vytvori graf
    function new_graph() {
        force = d3.layout.force()
            .charge(-400)       // zaporne hodnoty nastavuji jak se odpuzuji jednotlivy uzly
            .linkDistance(200)
            .gravity(0.05)
            .size([width, height])
            .on("tick", tick)
            .on("end", function () {
                node_c.each(function (d) {
                    d.fixed = true;
                });
            });
        main_block = d3.select('#' + id)
            .style("width", width)
            .style("height", height)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "border: 1px solid black;")
            .on("click", explicitlyPosition);

        force
            .nodes(nodes)
            .links(links)
            .start();

        link = main_block.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("fill-opacity", "0")
            .attr("stroke-opacity", "1")
            .attr("stroke", "#000000")/*function (d) {
                switch (d.speed) {
                    case "100": return "#6f00ff";
                    case "1000": return "#66cdaa";
                    case "10000": return "#ffff66";
                    case "40000": return "#ff4444";
                    case "100000": return "#000000";
                }
            })*/
            .attr("stroke-width", "6px")/*function (d) {
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

        node_g = main_block.selectAll("g.node")
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
            .attr("xlink:href", function (d) { return (d.type_node == "R") ? "img/router.svg" : "img/probe.svg" })
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
                my: 'center',  // Position my top left...
                at: 'center', // at the bottom right of...
                target: $(window),
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

        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("y2", function (d) { return d.target.y; })
                .attr("x2", function (d) { return d.target.x; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; })
                .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }
        refresh_links();
    }

// ------------------------------------------------------------------------------------------------------------
    // funkce pro zobrazeni mapy = NetTMap MAP

    // vytvori mapu
    function new_map() {
        if (nodes.length == 0) { // pokud nejsou zadne data vytvorim mapu s pohledme na cely svet
            main_block = L.map("map_canvas").setView([0, 0], 1);
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(main_block);
            return;
        }

        // souradnice pro urceni stredu mapy
        var x_data = [];
        var y_data = [];

        for (var count = 0; count < nodes_feature.length; count++) {    
            x_data.push(nodes_feature[count].geometry.coordinates[0]);
            y_data.push(nodes_feature[count].geometry.coordinates[1]);
        }

        // zobrazeni mapy s ohledem na souradnice bodu
        zoom = 7;
        error = null;
        main_block = L.map('map_canvas').setView([d3.median(y_data), d3.median(x_data)], zoom);

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(main_block);

        var default_style = {
            "color": "#000000",
            "weight": 5,
            "opacity": 1
        };

        all_feature = nodes_feature.concat(links_feature);

        // vlozeni uzlu do mapy jako obrazky
        var geoJsonLayer = L.geoJson(all_feature, {
            pointToLayer: function (feature, latlng) {
                var smallIcon = L.icon({
                    iconSize: [40, 40],
                    className: "node",
                    iconUrl: (feature.properties.type_node == "R") ? "img/router.svg" : "img/probe.svg"
                });

                return L.marker(latlng, { icon: smallIcon });
            },
            onEachFeature: function (feature, layer) {
                var popupOption = {
                    maxWidth: 640,
                    minWidth: 600,
                };
                layer.bindPopup('<iframe height="380" width="640" src="template/data.html" frameBorder="0" />', popupOption);
            },
            style: default_style
        }).addTo(main_block);

        // pridani uzlum ID + index v seznamu uzlu
        geoJsonLayer.eachLayer(function (layer) {
            if (layer.feature.geometry.type == 'LineString')
                layer._path.id = 'link_' + layer.feature.properties.index;
            else {
                layer._icon.id = 'node_' + layer.feature.properties.index;
                layer._icon.title = layer.feature.properties.name;
            }
        });
       
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

        refresh_links();

        /*
        //var group = new L.featureGroup(arc);
        //main_block.fitBounds(group.getBounds());

        // vlozeni linek jako d3 graf do mapy
        var svg = d3.select(main_block.getPanes().overlayPane).append("svg"),
            g = svg.append("g").attr("class", "leaflet-zoom-hide");

        function projectPoint(x, y) {
            var point = main_block.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }

        var transform = d3.geo.transform({ point: projectPoint }),
        path = d3.geo.path().projection(transform);

        var link = g.selectAll("path")
                        .data(links_feature)
                        .enter().append("path")
                        .attr("class", "link")
                        .style("fill", "white")
                        .style("stroke", "#000000")
                        .style("stroke-width", "6px")
                        .attr("title", function (d) { return d.properties.name; })
                        .attr("id", function (d) { return "link_" + d.properties.index; });

        main_block.on("viewreset", reset);
        reset();

        // Reposition the SVG to cover the features.
        function reset() {
            var bounds = path.bounds(data),
                topLeft = bounds[0],
                bottomRight = bounds[1];

            svg.attr("width", bottomRight[0] - topLeft[0])
                .attr("height", bottomRight[1] - topLeft[1])
                .style("left", topLeft[0] + "px")
                .style("top", topLeft[1] + "px");

            g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
            
            link.attr("d", path);
        }
        
        $('.link, .node').qtip({
            content: {
                button: 'Close',
                title: function (event, api) {
                    var title = api.elements.target.attr("title");
                    if (api.elements.target.attr("id").split('_')[0] == "node") {
                        current_type = "N";
                        current_item_index = api.elements.target.attr("id").split('_')[1];
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

        function set_type_path() {
            for (var count = 0; count < links.length; count++) {
                for (var i_count = count + 1; i_count < links.length; i_count++) {
                    if (links[count].channel == links[i_count].channel) links[count].inPair = 'R';
                }
            }
        }
        save_local_variable();
        */
    }

// ------------------------------------------------------------------------------------------------------------
    // funkce pro zobrazeni nasteveni zobrazeni grafu, mapy
    // vlozi do stranky formular pro vlozeni souboru s geoJson obsahem
    // listbox s refresh time, history interval
    function new_setting() {
        load_local_variable();
        default_input_form = d3.select('#' + id).append("table").style("width", width + 'px').attr("id", "settings_content");
        row1 = default_input_form.append("tr");
        row1.append("td").append("p").text("File: ");
        row1.append("td").attr("align", "left")
                            .append("button")
                            .attr("id", "input_geo_json_button")
                            .text("Load file")
                            .attr("onclick", "$('#input_geo_json_file').trigger('click');")
                            .attr("class", "btn-primary");
        row1.append("input")
            .attr("type", "file")
            .attr("id", "input_geo_json_file")
            .style("display", "none");
                            
        
        default_input_form.append("br");
        row1 = default_input_form.append("tr");
        row1.append("td").append("p").text("History interval: ");
        history_time_select = row1.append("td").attr("align", "left").append("select")
                            .attr("id", "history_time_input").attr("name", "history_time_input");
        history_time_select.append("option").attr("value", "86400000").text("1 day");
        history_time_select.append("option").attr("value", "43200000").text("12 hours");

        row1 = default_input_form.append("tr");
        row1.append("td").append("p").text("Refresh time: ");
        refresh_time_form = row1.append("td").attr("align", "left").append("select")
                            .attr("id", "refresh_time_input").attr("name", "refresh_time_input");
        refresh_time_form.append("option").attr("value", "0").text("Doesn't refreshed");
        refresh_time_form.append("option").attr("value", "30000").text("30 seconds");
        refresh_time_form.append("option").attr("value", "60000").text("1 minute");
        refresh_time_form.append("option").attr("value", "300000").text("5 minutes");
        refresh_time_form.append("option").attr("value", "600000").text("10 minutes");
        document.getElementById("refresh_time_input").value = "300000";

        row1 = default_input_form.append("tr");
        row1.append("td");
        row1.append("td").attr("align", "right").attr("id", "save_setting_button")
                  .append("input").attr("type", "submit").attr("value", "Save").attr("class", "btn-success");


        if (history_interval != "0") document.getElementById("history_time_input").value = history_interval;
        document.getElementById("refresh_time_input").value = refresh_time;

        document.getElementById('input_geo_json_file')
            .addEventListener('change', readSingleFile, false);
        document.getElementById('save_setting_button')
            .addEventListener('click', save_setting, false);

    }

    function readSingleFile(e) {
        var file = e.target.files[0];
        d3.select("#input_geo_json_button").text(file.name);
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            raw_json = jQuery.parseJSON(e.target.result);
        };
        reader.readAsText(file);
    }
    
    // inicializuje lokalni promenne, inicializuje lokalni pamet
    function init_local_variables() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = "";
            sessionStorage.links = "";
            sessionStorage.current_item_index = "";
            sessionStorage.current_type = "";
            sessionStorage.refresh_time = "0";
            sessionStorage.history_interval = "0";
            sessionStorage.nodes_count = "0";
            sessionStorage.links_count = "0";
            nodes = [];
            links = [];
            nodes_feature = [];
            links_feature = [];
            current_item_index = "";
            current_type = "";
            refresh_time = '0';
            history_interval = '0';
        } else {
            alert("Local storage isn't support");
        }

    }
    function load_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            if ((sessionStorage.nodes != null) && (sessionStorage.nodes != "")) nodes = jQuery.parseJSON(sessionStorage.nodes);
            if ((sessionStorage.nodes_count != null) && (sessionStorage.nodes_count != "")) nodes_count = parseInt(sessionStorage.nodes_count);
            if ((sessionStorage.links != null) && (sessionStorage.links != "")) links = jQuery.parseJSON(sessionStorage.links);
            if ((sessionStorage.links_count != null) && (sessionStorage.links_count != "")) links_count = parseInt(sessionStorage.links_count);
            if ((sessionStorage.nodes_feature != null) && (sessionStorage.nodes_feature != "")) nodes_feature = jQuery.parseJSON(sessionStorage.nodes_feature);
            if ((sessionStorage.links_feature != null) && (sessionStorage.links_feature != "")) links_feature = jQuery.parseJSON(sessionStorage.links_feature);
            if ((sessionStorage.current_item_index != null) && (sessionStorage.current_item_index != "")) current_item_index = sessionStorage.current_item_index;
            if ((sessionStorage.current_type != null) && (sessionStorage.current_type != "")) current_type = sessionStorage.current_type;
            if ((sessionStorage.refresh_time != null) && (sessionStorage.refresh_time != "")) refresh_time = sessionStorage.refresh_time;
            if ((sessionStorage.history_interval != null) && (sessionStorage.history_interval != "")) history_interval = sessionStorage.history_interval;
        } else {
            alert("Local storage isn't support");
        }
    }
    function save_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
            sessionStorage.nodes_count = nodes_count.toString();
            sessionStorage.links = JSON.stringify(links);
            sessionStorage.links_count = links_count.toString();
            sessionStorage.nodes_feature = JSON.stringify(nodes_feature);
            sessionStorage.links_feature = JSON.stringify(links_feature);
            sessionStorage.current_type = current_type;
            sessionStorage.current_item_index = current_item_index;
            sessionStorage.refresh_time = refresh_time;
            sessionStorage.history_interval = history_interval;
        }
        else {
            alert("Local storage isn't support");
        }

    }

    // nacte geoJson file, ulozi do interni struktury, ulozi do lokalni pameti
    function parse_geoJson(data) {
        // pokud se pouze inicializuje zobrazeni
        if (data == '') return;

        init_local_variables();

        // prevod z geoJson do force reprezentace
        for (count = 0; count < data.features.length; count++) {
            if (data.features[count].geometry.type == "Point") {
                node = data.features[count].properties;
                node.long = data.features[count].geometry.coordinates[0];
                node.lat = data.features[count].geometry.coordinates[1];
                nodes.push(node);
                nodes_feature.push(data.features[count]);
            }
            else {
                links.push(data.features[count].properties);
                links_feature.push(data.features[count]);
            }
        }

        for (count = 0; count < links.length; count++) {
            links[count].index = count;
            for (n_count = 0; n_count < nodes.length; n_count++) {
                if (links[count].source == nodes[n_count].name)
                    links[count].source = n_count;
                if (links[count].target == nodes[n_count].name)
                    links[count].target = n_count;
            }
        }

        for (count = 0; count < nodes.length; count++) {
            nodes[count].index = count;
            nodes[count].token = '';
        }

        save_local_variable();
    }

    function save_setting() {
        parse_geoJson(raw_json);
        refresh_time = document.getElementById("refresh_time_input").value;
        history_interval = document.getElementById("history_time_input").value;
        save_local_variable();
    }
// ------------------------------------------------------------------------------------------------------------
    // funkce pro zobrazeni formularu ke konfiguraci geoJson souboru
    function new_configure_file() {
        load_local_variable();
        if (type_visual_data == 'configure')
            create_main_form();
        else
            create_probe_form();
    }
    // vytvoreni formularu pro vkladani uzlu, linek, tabulky s existujicimi linkami, uzly
    function create_main_form() {
        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani uzlu
        div_form = d3.select('#' + id).append("div").attr("id", "forms_block");
        table_form = div_form.append("form").attr("id", "node_form").append("table").style("width", "45%");
        table_form.style("float", "left").attr("id", "input_form_node").style("margin-right", "1cm");
        // 0.radek - nadpis
        table_form.append("tr").append("h3").text("Node");

        // 1.radek - nazev
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Name: ")
                  .append("input").attr("id", "name_node").attr("name", "name_node").attr("type", 'text');

        // 2.radek - zemepisna delka
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Longitude: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text');

        // 3.radek - zemepisna sirka
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Latitude: ")
                  .append("input").attr("id", "latitude").attr("name", "latitude").attr("type", 'text');

        // 4.radek - typ uzlu = sonda / router
        /*
        type_node = table_form.append("tr").append("td").attr("align", "right").append("p").text("Typ: ")
                  .append("select").attr("id", "type_node").attr("name", "type_node");
        type_node.append("option").attr("value", "S").text("Sonda");
        type_node.append("option").attr("value", "R").text("Router");
        
        // 5.radek - adresa
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Adresa: ")
                  .append("input").attr("id", "address_node").attr("name", "address_node").attr("type", 'text');
        */

        // 6.radek - popis
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Description: ")
          .append("input").attr("id", "description_node").attr("name", "description_node").attr("type", 'text');

        // 7.radek - tlacitko
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Add").attr("class", "btn btn-primary");
        //.attr("onclick", "NetTMap_setting.getInstance().add_node(this);");

        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani linek
        table_form = div_form.append("form").attr("id", "link_form").append("table").style("width", "45%")
        table_form.attr("id", "input_form_link");
        // 0.radek - nadpis
        table_form.append("tr").append("h3").text("Link");

        // 1.radek - nazev
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Name: ")
          .append("input").attr("id", "name_link").attr("name", "name_link").attr("type", 'text');

        // 2.radek - zdrojovy uzel
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Source: ")
                  .append("select").attr("id", "source_node").attr("name", "source_node");

        // 3.radek - zdrojovy port
        /*
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zdrojovy port: ")
          .append("input").attr("id", "source_port").attr("name", "source_port").attr("type", 'text');
        */
        // 4 radek - cilovy uzel
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Target: ")
                  .append("select").attr("id", "target_node").attr("name", "target_node");

        // 5.radek - rychlost linky
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Speed: ")
                  .append("select").attr("id", "speed_link").attr("name", "speed_link");
        speed_select = d3.select("#speed_link");
        speed_select.append("option").attr("value", "").text("");
        speed_select.append("option").attr("value", "100").text("100M");
        speed_select.append("option").attr("value", "1000").text("1G");
        speed_select.append("option").attr("value", "10000").text("10G");
        speed_select.append("option").attr("value", "40000").text("40G");
        speed_select.append("option").attr("value", "100000").text("100G");


        // 6.radek - prazdny
        //table_form.append("tr").attr("height", $('tr').eq(1).height()).append("td");

        // 7.radek 
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", 'Add').attr("class", "btn btn-primary");
        //.attr("onclick", "NetTMap_setting.getInstance().add_link();");

        d3.select('#' + id).append("hr");
        tables = d3.select('#' + id).append("div").attr("id", "tables_block");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni linek
        tables.append("h3").text("Links");
        title_link = tables
             .append("table")
             .attr("class", "table table-hover")
             .attr("id", "link_setting_result")
             .attr("border", "1")
             .attr("width", $("#input_form_link").width());
        table_head = title_link.append("thead").append("tr");
        table_head.append("th").text("Name");
        table_head.append("th").text("Speed");
        table_head.append("th").text("Source node");
        table_head.append("th").text("Source channel");
        table_head.append("th").text("Target node");
        table_head.append("th").text("Target channel");
        table_head.append("th").text("Delete");
        table_head.append("th").text("NetFlow probe");

        update_table_link();

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni uzlu
        tables.append("h3").text("Routers");
        title = tables
            .append("table")
            .attr("class", "table table-hover")
            .attr("id", "node_setting_result")
            .style("float", "left")
            .style("margin-right", "1cm")
            .attr("border", "1")
            .attr("width", $("#input_form_node").width());
        table_head = title.append("thead").append("tr");
        table_head.append("th").text("Name");
        table_head.append("th").text("Longitude");
        table_head.append("th").text("Latitude");
        table_head.append("th").text("Type");
        table_head.append("th").text("Address");
        //table_head.append("td").text("Description");
        table_head.append("th").text("Delete");

        update_table_node();
        // -------------------------------------------------------------------------------------------------------------------
        // tlacitko pro vytvoreni exportu
        d3.select('#' + id).append("hr");
        d3.select('#' + id).append("div").attr("id", "button_block")
             .append("button").attr("type", "button").attr("class", "btn btn-success").attr("id", "save_file_button");
        $("#save_file_button").html('<i class="fa fa-download" />&nbsp Save file');
        document.getElementById('button_block').addEventListener('click', create_file, false);

        set_validate_rules();

        //document.onhaschange(alert("zmeneno!!!!"));
    }
    function set_validate_rules() {
        $("#node_form").validate({
            rules: {
                name_node: "required",
                //type_node: "required",
                //address_node: "required",
                latitude: {
                    required: true,
                    number: true
                },
                longitude: {
                    required: true,
                    number: true
                }
            },
            messages: {
                name_node: "Insert name",
                //type_node: "Vyberte typ uzlu",
                //address_node: "Insert address",
                latitude: {
                    required: "Insert latitude",
                    number: "Value must be number"
                },
                longitude: {
                    required: "Insert longitude",
                    number: "Value must be number"
                }
            },
            submitHandler: function (form) {
                // do other things for a valid form
                //form.submit();
                insert_node();
            }
        });

        $("#link_form").validate({
            rules: {
                target_node: "required",
                //target_port: "required",
                source_node: "required",
                //source_port: "required",
                //name_link: "required",
                speed_link: "required"
            },
            messages: {
                target_node: "Select a target node",
                //target_port: "Vyberte cilovy port",
                source_node: "Select a source node",
                //source_port: "Vyberte zdrojovy port",
                //name_link: "Zadejte nazev linky",
                speed_link: "Select a speed of link"
            },
            submitHandler: function (form) {
                // do other things for a valid form
                //form.submit();
                insert_link();
            }
        });

    }

    // aktualizace tabulky uzlu
    function update_table_node() {
        update_list_node();
        table = d3.select("#node_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (count = 0; count < nodes.length; count++) {
            table_row = table_body.append("tr");
            table_row.attr("id", "node_" + count);
            table_row.append("td").text(nodes[count].name);
            table_row.append("td").text(nodes[count].long);
            table_row.append("td").text(nodes[count].lat);
            table_row.append("td").text(function () {
                if (nodes[count].type_node == 'R')
                    return "Router";
                else if (nodes[count].hw == "")
                    return "NetFlow probe";
                else
                    return "NetFlow probe (" + nodes[count].hw + ')';
            });
            table_row.append("td").text(nodes[count].address);
            //table_row.append("td").text(n.description);
            table_row.append("td").append("input").attr("align", "center")
                .attr("type", "submit")
                .attr("value", "...")
                .attr("class", "btn-danger")
                .attr("id", "node_" + count + "_del")
            //.attr("onclick", 'NetTMap_setting.getInstance().delete_node(this.id);');

            document.getElementById("node_" + count + "_del")
                .addEventListener('click', function (d) { delete_node(d.target.id); }, false);
        }
        /*
        if ($("#node_setting_result").height() > $("#link_setting_result").height()) {
            d3.select("#tables_block").style("height", $("#node_setting_result").height() + "px");
        }
        else {
            d3.select("#tables_block").style("height", $("#link_setting_result").height() + "px");
        }
        */

        console.log('window: ' + window.innerWidth + ', ' + window.innerHeight);
        var body = document.body,
        html = document.documentElement;
        /*
        window.innerHeight = window.innerHeight + 20;
        var height = Math.max(body.scrollHeight, body.offsetHeight,
                               html.clientHeight, html.scrollHeight, html.offsetHeight);
        console.log('body.scrollHeight: ' + body.scrollHeight);
        console.log('body.offsetHeight: ' + body.offsetHeight);
        console.log('html.clientHeight: ' + html.clientHeight);
        console.log('html.scrollHeight: ' + html.scrollHeight);
        console.log('html.offsetHeight: ' + html.offsetHeight);
        */
    }
    function update_list_node() {
        source_node_box = d3.select("#source_node");

        source_node_box.selectAll("option").remove();
        source_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            source_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }

        target_node_box = d3.select("#target_node");

        target_node_box.selectAll("option").remove();
        target_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            target_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }

    // aktualizace tabulky linek
    function update_table_link() {
        table = d3.select("#link_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (var count = 0; count < links.length; count++) {
            table_row = table_body.append("tr");
            table_row.attr("id", "link_" + count);
            table_row.append("td").text(links[count].name);
            table_row.append("td").text(function () { return (links[count].speed / 1000) + 'G'; });
            table_row.append("td").text(links[count].source);
            table_row.append("td").text(links[count].source_port);
            table_row.append("td").text(links[count].target);
            table_row.append("td").text(links[count].target_port);
            table_row.append("td").attr("align", "center").append("input")
                .attr("type", "submit")
                .attr("value", "...")
                .attr("class", "btn-danger")
                .attr("id", "link_" + count + "_del");

            document.getElementById("link_" + count + "_del")
                .addEventListener('click', function (d) { delete_link(d.target.id); }, false);

                //.attr("onclick", 'NetTMap_setting.getInstance().delete_link(this.id);');
            table_row.append("td").attr("align", "center").append("input")
                .attr("type", "submit")
                .attr("class", "btn-primary")
                .attr("value", "+")
                .attr("title", links[count].name)
                .attr("id", "link_btn_" + count);

            $("#link_btn_" + count).qtip({
                content: {
                    button: 'Close',
                    title: function (event, api) {
                        local_id = api.elements.target.attr("id");
                        my_id = local_id.split("_");
                        if (typeof (Storage) !== "undefined") {
                            sessionStorage.curr_link_index = my_id[2];
                        } else {
                            alert("Local storage isn't support");
                        }
                        return api.elements.target.attr("title");
                    },
                    text: function () { return '<iframe height="430" width="820" src="template/probe.html" />'; }//'Loading...',
                },
                show: {
                    solo: true,
                    event: 'click',
                    modal: {
                        on: false,
                        effect: true,
                        blur: true,
                        escape: true
                    }
                },
                hide: {
                    fixed: true,
                    event: 'unfocus'
                },
                position: {
                    my: 'center',
                    at: 'center',
                    target: $(window),
                    adjust: {
                        screen: true
                    }
                },
                style: {
                    classes: 'qtip-bootstrap',
                    width: 860,
                    height: 490
                },
                events: {
                    toggle: function (event, api) {
                        if (event.type == 'tooltipshow')
                            save_local_variable();
                        if (event.type == 'tooltiphide')
                            update_table_node();
                    }
                }
            });
        }
        /*
        if ($("#node_setting_result").height() > $("#link_setting_result").height()) {
            d3.select("#tables_block").style("height", $("#node_setting_result").height() + "px");
        }
        else {
            d3.select("#tables_block").style("height", $("#link_setting_result").height() + "px");
        }
        */
    }

    function insert_node() {
        if ($('#node_form').valid() == false) {
            return;
        }

        name = document.getElementById("name_node").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;
        type_node = "R";//document.getElementById("type_node").value;
        address_node = "";//document.getElementById("address_node").value;
        description_node = document.getElementById("description_node").value;
        source_node = "";//document.getElementById("source_node").value;
        source_port = "";//document.getElementById("source_port").value;
        target_node = "";//document.getElementById("target_node").value;
        target_port = "";//document.getElementById("target_port").value;
        hardware = "";

        $('#node_form')[0].reset();

        node = {
            name: name,
            lat: latitude,
            long: longitude,
            type_node: type_node,
            address: address_node,
            description: description_node,
            hw: hardware
            //source: source_node,
            //source_port: source_port,
            //target: target_node,
            //target_port: target_port
        };
        nodes.push(node);
        update_table_node();
    }
    function insert_link() {
        if ($('#link_form').valid() == false) {
            return;
        }

        name_link = document.getElementById("name_link").value;
        source = document.getElementById("source_node").value;
        source_port = "";//document.getElementById("source_port").value;
        target = document.getElementById("target_node").value;
        target_port = "";//document.getElementById("target_port").value;
        speed_link = document.getElementById("speed_link").value;

        $('#link_form')[0].reset();

        link = {
            source: source,
            source_port: source_port,
            speed: speed_link,
            target: target,
            target_port: target_port,
            name: name_link,
            node: ""
        };
        links.push(link);

        update_table_link();
    }

    function delete_node(count) {
        nodes.splice(count, 1);
        //d3.select("#" + id).remove();
        update_list_node();
        update_table_node();
    }
    function delete_link(id) {
        var count;
        for (count = 0; count < links.length; count++) {
            if ('link_' + count + '_del' == id) {
                break;
            }
        }
        links.splice(count, 1);
        d3.select("#" + id).remove();
        update_list_node();
        update_table_link();
    }

    // vytvoreni formulare pro vlozeni sondy
    function create_probe_form() {
        d3.select('#' + id).attr("width", width).attr("height", height);

        div_form = d3.select('#' + id).append("div");
        table_form = div_form.append("form").attr("id", "probe_form").append("table");

        // 1.radek - nazev, listbox s existujicima sondama
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Name: ")
                  .append("input").attr("id", "probe_name").attr("name", "probe_name").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("NetFlow probe: ")
          .append("select").attr("id", "probe_node").attr("name", "probe_node");
        document.getElementById("probe_node").addEventListener('change', prepopulation_list_probe, false);

        // 2. radek - popis, adresa
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Description: ")
                  .append("input").attr("id", "description").attr("name", "description").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Address: ")
                  .append("input").attr("id", "address").attr("name", "address").attr("type", 'text');

        // 3.radek - zemepisna delka, sirka
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Longitude: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Latitude: ")
                  .append("input").attr("id", "latitude").attr("name", "latitude").attr("type", 'text');

        // 4.radek - zdrojovy uzel, cilovy uzel
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Source node: ")
                  .append("input").attr("id", "source_node").attr("name", "source_node").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Target node: ")
          .append("input").attr("id", "target_node").attr("name", "target_node").attr("type", 'text');


        // 5.radek - zdrojovy port, cilovy port
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Source channel: ")
                  .append("input").attr("id", "source_port").attr("name", "source_port").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Target channel: ")
                  .append("input").attr("id", "target_port").attr("name", "target_port").attr("type", 'text');

        // 6.radek - HW sondy
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Hardware: ").append("select").attr("id", "hardware").attr("name", "hardware");
        load_hw_type();
        tr1.append("td");


        // 7.radek - tlacitko
        tr1 = table_form.append("tr");
        tr1.append("td");
        tr1.append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Insert NetFlow probe").attr("class", "btn-primary").attr("id", "insert_probe_btn");
        document.getElementById("insert_probe_btn").addEventListener('onchange', insert_probe, false);

        update_list_probe();

        d3.select("#target_node")
            .attr("value", links[current_item_index].target)
            .attr("readonly", "readonly");
        d3.select("#source_node")
            .attr("value", links[current_item_index].source)
            .attr("readonly", "readonly");

        // validace formulare
        $("#probe_form").validate({
            rules: {
                probe_name: "required",
                address: "required",
                latitude: {
                    required: true,
                    number: true
                },
                longitude: {
                    required: true,
                    number: true
                },
                source_port: "required",
                target_port: "required"
            },
            messages: {
                probe_name: "Insert name",
                address: "Insert probe's address ",
                latitude: {
                    required: "Insert latitude",
                    number: "Value must be number"
                },
                longitude: {
                    required: "Insert longitude",
                    number: "Value must be number"
                },
                source_port: "Insert name of link for way from source node to NetFlow probe",
                target_port: "Insert name of link for way from target node to NetFlow probe"
            },
            submitHandler: function (form) {
                // do other things for a valid form
                form.submit();
            }
        });

    }
    // vyplneni dostupnych sond do list boxu
    function update_list_probe() {
        probe_node_box = d3.select("#probe_node");

        probe_node_box.selectAll("option").remove();
        probe_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == "S")
                probe_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }
    // predvyplneni dostupnych udaju o existujici sonde
    function prepopulation_list_probe() {
        curr_val = document.getElementById("probe_node").value;

        for (s_count = 0; s_count < nodes.length; s_count++) {
            if (nodes[s_count].name == curr_val) {
                document.getElementById("probe_name").value = nodes[s_count].name;
                document.getElementById("latitude").value = nodes[s_count].lat;
                document.getElementById("longitude").value = nodes[s_count].long;
                document.getElementById("address").value = nodes[s_count].address;
                document.getElementById("description").value = nodes[s_count].description;
                document.getElementById("hardware").value = nodes[s_count].hw;
                break;
            }
        }
    }
    // nacte do listboxu jmena HW zarizeni z json souboru
    function load_hw_type() {
        d3.json(path_hw_type, load_type);

        function load_type(error, data) {
            if (error) throw error;

            var probe_select_input = d3.select('#hardware');
            probe_select_input.append("option").attr("value", "").text("");
            for (var t_count = 0; t_count < data.hardware.length; t_count++) {
                probe_select_input.append("option").attr("value", data.hardware[t_count].pn).text(data.hardware[t_count].pn);
            }
        }
    }

    function insert_probe() {
        if ($('#probe_form').valid() == false) {
            return;
        }
        // uprava linky -> rozdeleni linky na dve, vlozeni uzlu typu sonda
        name = document.getElementById("probe_name").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;
        type_node = "S";//document.getElementById("type_node").value;
        address_node = document.getElementById("address").value;
        description_node = document.getElementById("description").value;
        source_node = document.getElementById("source_node").value;
        source_port = document.getElementById("source_port").value;
        target_node = document.getElementById("target_node").value;
        target_port = document.getElementById("target_port").value;
        probe_node = document.getElementById("probe_node").value;
        hardware = document.getElementById("hardware").value;

        node = {};
        if (probe_node == "") {
            node = {
                name: name,
                lat: latitude,
                long: longitude,
                type_node: type_node,
                address: address_node,
                description: description_node,
                hw: hardware
            };
            nodes.push(node);
        }
        else {
            for (s_count = 0; s_count < nodes.length; s_count++) {
                if (nodes[s_count].name == probe_node) {
                    nodes[s_count].name = name;
                    nodes[s_count].lat = latitude;
                    nodes[s_count].long = longitude;
                    nodes[s_count].address = address_node;
                    nodes[s_count].description = description_node;
                    nodes[s_count].hardware = hardware;
                    break;
                }
            }
        }

        links[current_item_index].source_port = source_port;
        links[current_item_index].target_port = target_port;
        links[current_item_index].node = name;

        save_local_variable();
        parent.closeQTip();
    }

    function create_file() {
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";

        // uklada uzly
        for (count = 0; count < nodes.length; count++) {
            curr_node = '{ "geometry": { "type": "Point", "coordinates": [ '
                        + nodes[count].long + ', ' + nodes[count].lat + ' ]},';
            curr_node += '"properties": { "name": "' + nodes[count].name
                      + '", "type_node": "' + nodes[count].type_node
                      + '", "description": "' + nodes[count].description
                      + '", "hw": "' + nodes[count].hw
                      + '", "address": "' + nodes[count].address + '"},';
            curr_node += '"type": "Feature" }';
            if (count != nodes.length - 1) { curr_node += ','; }
            content += curr_node;
        }

        if (links.length != 0) { content += ','; }

        // uklada linky
        for (count = 0; count < links.length; count++) {
            source_coordinates = "";
            for (s_count = 0; s_count < nodes.length; s_count++) {
                if (nodes[s_count].name == links[count].source) {
                    source_coordinates = '[ ' + nodes[s_count].long + ', ' + nodes[s_count].lat + ' ]';
                    break;
                }
            }

            dest_coordinates = "";
            for (d_count = 0; d_count < nodes.length; d_count++) {
                if (nodes[d_count].name == links[count].target) {
                    dest_coordinates = '[ ' + nodes[d_count].long + ', ' + nodes[d_count].lat + ' ]';
                    break;
                }
            }

            if (links[count].node != '') { // linka spojuje 2 uzly -> je na ni sonda
                var probe_index = 0;
                for (p_count = 0; p_count < nodes.length; p_count++) {
                    if ((nodes[p_count].name == links[count].node) && (nodes[p_count].type_node == 'S')) {
                        probe_index = p_count;
                        break;
                    }
                }

                var probe_coordinates = '[' + nodes[probe_index].long + ', ' + nodes[probe_index].lat + ' ]';

                // vytvorim 2 linky
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + probe_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source
                            + '", "target": "' + nodes[probe_index].name
                            + '", "source_channel": "' + links[count].source_port
                            + '", "target_channel": "' + links[count].target_port
                            + '", "speed": "' + links[count].speed
                            + '", "node": "' + links[count].node
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" },';
                content += curr_node;

                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + probe_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + nodes[probe_index].name
                            + '", "target": "' + links[count].target
                            + '", "source_channel": "' + links[count].source_port
                            + '", "target_channel": "' + links[count].target_port
                            + '", "speed": "' + links[count].speed
                            + '", "node": "' + links[count].node
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" }';
                if (count != links.length - 1) { curr_node += ','; }
                content += curr_node;
            }
            else {
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source
                            + '", "target": "' + links[count].target
                            + '", "source_channel": "' + links[count].source_port
                            + '", "target_channel": "' + links[count].target_port
                            + '", "speed": "' + links[count].speed
                            + '", "node": "'
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" }';
                if (count != links.length - 1) { curr_node += ','; }
                content += curr_node;
            }
        }
        content += ']}';    // end
        window.open('data:text/json;charset=utf-8,' + escape(content))
    }

// ------------------------------------------------------------------------------------------------------------
}