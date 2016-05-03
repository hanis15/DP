/* NetTMap library
 * Paremter
 */

var NetTMap = (function () {
    var graph_instance;

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create() {
        graph_instance = new NetTMap_module();
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

function NetTMap_module() {
    var id;                                 // id elementu v HTML ve kterem se ma graf vykreslit
    var height;                             // vyska elementu
    var width;                              // sirka elementu
    var main_block;                         // blok ve kterem je vykreslen samotny graf
    var input_form;                         // hlavicka stranky - zobrazuje se nad grafem
    var color_spectrum_block;               // paticka stranky - zobrazuje se pod grafem
    var color_spectrum_scale;               // barevna skala pro zobrazeni vytizeni linky

    var nodes = [];                         // pole vsech nactenych uzlu
    var nodes_count = 0;                    // citac uzlu - pouziva se pro jednoznacnou identifikaci uzlu
    var links = [];                         // pole vsech nactenych linek
    var links_count = 0;                    // citac linek - pouziva se pro jednoznacnou identifikaci linek
    var nodes_feature = [];                 // geoJson uzlu
    var links_feature = [];                 // geoJson linek
    var current_type;                       // urcuje typ zobrazovanych dat v popup ('L' = linka, 'N' = uzel)
    var current_item_index;                 // index prenaseny do popup, urcuje index v danem poli
    var refresh_time = '0';                 // interval po kterem se maji update stavu linek
    var history_interval = '0';
    var source_file_name = '';              // nazev nahraneho souboru

    var last_time_update;                   // posledni cas refresh

    var path_hw_type = 'probe_type.json'; // cesta k souboru s typem hardware sond

    var type_visual_data;                   // uchovava typ zobrazeneho grafu ('map' = leaflet mapa, 'graph' = d3 graf, 'setting' = nastaveni zobrazeni)
    var type_action;                        // udava jake akce se maji provest pro danny dialog ('new', 'edit')

    var zoom;                               // urcuje uroven zoom na mape
// ------------------------------------------------------------------------------------------------------------
    // verejne funkce
    this.initialize = init_graph;
    this.save_router = save_router;
    this.prepare_router_form = prepare_router;

    this.save_probe = save_probe;
    this.prepare_probe_form = prepare_probe;

    this.save_link = save_link;
    this.prepare_link_form = prepare_link;

    this.save_link_probe = save_link_probe;
    this.prepare_link_probe_form = prepare_link_probe;
    this.load_channel_name = load_channel_name;
    
    // inicializuje box pro zobrazeni grafu / mapy
    function init_graph(i, type, w, h) {
        load_local_variable();
        id = i;
        if (typeof (w) === 'undefined')
            width = $('.navbar-inverse').width();
        else
            width = w;
        if (typeof (h) === 'undefined') {
            height = window.innerHeight - $('.navbar-inverse').height();
            if ($('.navbar-inverse').height() == null)
                height -= $('.navbar-inverse').height();
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
        var host = nodes[node_index].hostname;
        document.body.style.cursor = 'wait';
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
                token = msg.access_token;
                nodes[node_index].token = msg.access_token;
                nodes[node_index].token_refresh = msg.refresh_token;
                if (type_visual_data == 'configure') {
                    get_channel_name(token, node_index);
                }
                else {
                    save_local_variable();
                    get_data_traffic(token, node_index);
                }
            },

            error: function (a, b, err) {
                console.log(err);
                document.body.style.cursor = 'default';
            },
        });
    }
    // ziska data o provozu
    function get_data_traffic(token, node_index) {
        var host = nodes[node_index].hostname;
        document.body.style.cursor = 'wait';
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
                document.body.style.cursor = 'default';
            },
            error: function (a, b, err) {
                console.log(err);
                document.body.style.cursor = 'default';
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
    // ziska jmena vsech channel na dane sonde - pro list boxy v konfiguraci
    function get_channel_name(token, node_index) {
        var host = nodes[node_index].hostname;
        document.body.style.cursor = 'wait';
        $.ajax({
            type: "GET",
            url: "https://" + host + "/rest/fmc/profiles/id", // typ zobrazovaneho grafu
            headers: { "Authorization": "bearer " + token },
            data: { id: "live" },
            success: function (msg) {
                // na obj je aplikovan json,ktery byl nacten
                insert_channel_name(msg, node_index);
                document.body.style.cursor = 'default';
            },
            error: function (a, b, err) {
                console.log(err);
                document.body.style.cursor = 'default';
            },
        });
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

        document.getElementById('save_setting_button')
            .addEventListener('click', save_setting, false);

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
            sessionStorage.source_file_name = "";
            nodes = [];
            links = [];
            nodes_feature = [];
            links_feature = [];
            current_item_index = "";
            current_type = "";
            refresh_time = '0';
            history_interval = '0';
            source_file_name = "";
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
            if ((sessionStorage.source_file_name != null) && (sessionStorage.source_file_name != "")) source_file_name = sessionStorage.source_file_name;
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
            sessionStorage.source_file_name = source_file_name;
        }
        else {
            alert("Local storage isn't support");
        }
        /*
        navigator.webkitTemporaryStorage.queryUsageAndQuota(
        function (usedBytes, grantedBytes) {
                console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
            },
            function (e) { console.log('Error', e); }
        );*/
    }


    function save_setting() {
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
        tables = d3.select('#' + id).append("div").attr("id", "tables_block");
        head = tables.append("table").attr("class", "table").append("tr");
        head.append("th").append("h1").text("Topology configuration");
        head = head.append("th").style("width", "30px");
        head.append("button").attr("type", "button").attr("class", "btn btn-primary")
            .attr("id", "load_file_button").attr("title", "Load file with topology");
        head.append("input")
            .attr("type", "file")
            .attr("id", "input_geo_json_file")
            .style("display", "none");

        $("#load_file_button").html('<i class="fa fa-upload" />&nbsp Load file');
        head.append('span').attr('width', $('#load_file_button').width() + 'px').attr("class", "label label-default").attr("id", "file_name_label")
            .text("File: " + (((source_file_name == "") || (source_file_name == 'undefined')) ? "---" : source_file_name));
        document.getElementById('load_file_button').addEventListener('click', function () { $('#input_geo_json_file').trigger('click'); }, false);
        document.getElementById('input_geo_json_file').addEventListener('change', load_file, false);

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni linek
        head = tables.append("table").append("tr");
        head.append("th").append("h2").text("Links");
        head.append("th").style("width", "20px");
        head.append("th").append("a").attr("href", "template/link.html").attr("class", "btn btn-success btn-sm")
            .attr("data-toggle", "modal").attr("data-target", "#detailModal").attr("id", "add_link_button").attr("title", "New link");
        $("#add_link_button").html('<i class="fa fa-plus fa-fw" />');
        title_link = tables
             .append("table")
             .attr("class", "table table-hover")
             .attr("id", "link_setting_result")
             .attr("border", "1");
        table_head = title_link.append("thead").attr("class", "thead-inverse").append("tr");
        table_head.append("th").text("Name");
        table_head.append("th").text("Speed");
        table_head.append("th").text("Source router");
        table_head.append("th").text("Target router");
        table_head.append("th").text("NetFlow probe");
        table_head.append("th").text("Channel 1");
        table_head.append("th").text("Channel 2");
        table_head.append("th").text("Actions");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni sond
        head = tables.append("table").append("tr");
        head.append("th").append("h2").text("NetFlow probe");
        head.append("th").style("width", "20px");
        head.append("th").append("a").attr("href", "template/probe.html").attr("class", "btn btn-success btn-sm")
            .attr("data-toggle", "modal").attr("data-target", "#detailModal").attr("id", "add_probe_button").attr("title", "New NetFlow probe");
        $("#add_probe_button").html('<i class="fa fa-plus fa-fw" />');
        title = tables
            .append("table")
            .attr("class", "table table-hover")
            .attr("id", "probe_setting_result")
            .attr("border", "1");
        table_head = title.append("thead").append("tr");
        table_head.append("th").text("Hostname");
        table_head.append("th").text("Longitude");
        table_head.append("th").text("Latitude");
        table_head.append("th").text("Address");
        table_head.append("th").text("Description");
        table_head.append("th").text("Actions");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni routeru
        head = tables.append("table").append("tr");
        head.append("th").append("h2").text("Routers");
        head.append("th").style("width", "20px");
        head.append("th").append("a").attr("href", "template/router.html").attr("class", "btn btn-success btn-sm")
            .attr("data-toggle", "modal").attr("data-target", "#detailModal").attr("id", "add_router_button").attr("title", "New router");
        $("#add_router_button").html('<i class="fa fa-plus fa-fw" />');

        title = tables
            .append("table")
            .attr("class", "table table-hover")
            .attr("id", "router_setting_result")
            .attr("border", "1");
            //.attr("width", $("#input_form_router").width());
        table_head = title.append("thead").append("tr");
        table_head.append("th").text("Name");
        table_head.append("th").text("Longitude");
        table_head.append("th").text("Latitude");
        table_head.append("th").text("Address");
        table_head.append("th").text("Description");
        table_head.append("th").text("Actions");

        // -------------------------------------------------------------------------------------------------------------------
        // tlacitko pro vytvoreni exportu, ulozeni nastaveni
        tables.append("hr");
        button_div = tables.append("div").attr("id", "button_block").attr("class", "btn-toolbar");

        button_div.append("button").attr("type", "button").attr("class", "btn btn-primary").attr('data-dismiss', 'alert')
            .attr("id", "save_settings_button").attr("title", "Save settings");
        $("#save_settings_button").html('<i class="fa fa-floppy-o" />&nbsp Save');
        document.getElementById('save_settings_button').addEventListener('click', function () {
            save_local_variable();

            alert = d3.select('body').insert('div').attr('class', 'alert alert-success alert-position').attr("id", "success_alert");
            alert.append("button").attr("type", "button").attr("class", "close").attr("data-dismiss", "alert");
            $("#success_alert button").html('<i class="fa fa-times" />');
            alert.append("p").text("Success. Topology was saved.");

            $('#success_alert').show();
            $("#success_alert").fadeTo(2000, 500).slideUp(500, function () {
                $("#success_alert").alert('close');
            });

        }, false);

        button_div.append("button").attr("type", "button").attr("class", "btn btn-secondary")
            .attr("id", "save_file_button").attr("title", "Create file and download it");
        $("#save_file_button").html('<i class="fa fa-download" />&nbsp Save file');
        document.getElementById('save_file_button').addEventListener('click', function () {
            create_file();
        }, false);

        button_div.append("button").attr("type", "button").attr("class", "btn btn-danger")
            .attr("id", "clear_data_button").attr("title", "Permanent remove all data");
        $("#clear_data_button").html('<i class="fa fa-trash-o" />&nbsp Clear all');
        document.getElementById('clear_data_button').addEventListener('click', function () {
            init_local_variables();
            update_all_tables();
            document.getElementById('file_name_label').innerHTML = 'File: ---';

            alert = d3.select('#body').insert('div', ":first-child").attr('class', 'alert alert-danger alert-position').attr("id", "danger_alert");
            alert.append("button").attr("type", "button").attr("class", "close").attr("data-dismiss", "alert");
            $("#danger_alert button").html('<i class="fa fa-times" />');
            alert.append("p").text("Topology was deleted.");

            $('#danger_alert').show();
            $("#danger_alert").fadeTo(2000, 500).slideUp(500, function () {
                $("#danger_alert").alert('close');
            });
        }, false);

        update_all_tables();

        // odebrani nactenych dat po skryti modal dialogu
        $(document).on('hidden.bs.modal', function (e) {
            $(e.target).removeData('bs.modal');
            type_action = '';
            current_item_index = '';
        });

        // nastaveni parametru pro naplneni modal dialogu
        $(document).on('show.bs.modal', function (e) {
            var id_part = [];
            if (e.relatedTarget.id.indexOf('add') != -1)
                type_action = 'new';
            else {
                id_part = e.relatedTarget.id.split("_");
                type_action = 'detail';
                current_item_index = id_part[3];
            }
        });
    }
    function update_table_link() {
        table = d3.select("#link_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (var count = 0; count < links.length; count++) {
            table_row = table_body.append("tr").attr("scope", "row");
            table_row.attr("id", "link_" + links[count].id);
            table_row.append("td").text(links[count].name);
            table_row.append("td").text(function () { return (links[count].speed / 1000) + 'G'; });
            table_row.append("td").text(nodes[parseInt(links[count].source)].hostname);
            table_row.append("td").text(nodes[parseInt(links[count].target)].hostname);
            if (links[count].probe == "")
                table_row.append("td");
            else
                table_row.append("td").text(nodes[parseInt(links[count].probe)].hostname);
            table_row.append("td").text(links[count].channel1);
            table_row.append("td").text(links[count].channel2);
            action_td = table_row.append("td").attr("class", "col-md-1").attr("align", "center").append("div").attr("class", "btn-group");
            if (links[count].probe == "") {
                action_td.append("button") // pridani sondy
                    .attr("href", "template/link_probe.html").attr("data-toggle", "modal").attr("data-target", "#detailModal")
                    .attr("class", "btn btn-xs btn-success").attr("title", "Add NetFlow probe").attr("id", "link_probe1_btn_" + links[count].id);
                $("#link_probe1_btn_" + links[count].id).html('<i class="fa fa-plug fa-fw" id="link_probe1_icon_' + links[count].id + '"></>');
            }
            else {
                action_td.append("button") // pridani sondy
                    .attr("type", "button").attr("class", "btn btn-xs btn-warning").attr("title", "Remove NetFlow probe").attr("id", "link_probe2_btn_" + links[count].id);
                $("#link_probe2_btn_" + links[count].id).html('<i class="fa fa-eraser fa-fw" id="link_prob2_icon_' + links[count].id + '"></>');
                document.getElementById('link_probe2_btn_' + links[count].id).addEventListener('click', function (d) {
                    unmount_link_probe(d.target.id);
                }, false);
            }
            action_td.append("button")  // detail linky
                .attr("href", "template/link.html").attr("data-toggle", "modal").attr("data-target", "#detailModal")
                .attr("class", "btn btn-xs btn-info").attr("title", "Info about link").attr("id", "link_info_btn_" + links[count].id);
            $("#link_info_btn_" + links[count].id).html('<i class="fa fa-pencil-square-o fa-fw" id="link_info_icon_' + links[count].id + '"></>');

            action_td.append("button")  // smazani linky
                .attr("type", "button")
                .attr("class", "btn btn-xs btn-danger")
                .attr("title", "Delete link")
                .attr("id", "link_del_btn_" + links[count].id);
            $("#link_del_btn_" + links[count].id).html('<i class="fa fa-trash-o fa-fw" id="link_del_icon_' + links[count].id + '"></>');
            document.getElementById("link_del_btn_" + links[count].id).addEventListener('click', function (d) {
                delete_link(d.target.id);
            }, false);
        }
    }
    function update_table_probe() {
        //update_list_node();
        table = d3.select("#probe_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'R') continue;
            table_row = table_body.append("tr");
            table_row.attr("id", "probe_" + nodes[count].id);
            table_row.append("td").text(nodes[count].hostname);
            table_row.append("td").text(nodes[count].long);
            table_row.append("td").text(nodes[count].lat);
            table_row.append("td").text(nodes[count].address);
            table_row.append("td").text(nodes[count].description);
            action_td = table_row.append("td").attr("class", "col-md-1").attr("align", "center").append("div").attr("class", "btn-group");

            action_td.append("a")  // detail sondy
                .attr("href", "template/probe.html").attr("data-toggle", "modal").attr("data-target", "#detailModal")
                .attr("class", "btn btn-xs btn-info").attr("title", "Info about NetFlow probe").attr("id", "probe_info_btn_" + nodes[count].id);
            $("#probe_info_btn_" + nodes[count].id).html('<i class="fa fa-pencil-square-o fa-fw"></>');

            action_td.append("button")  // smazani sondy
                .attr("type", "button")
                .attr("class", "btn btn-xs btn-danger")
                .attr("title", "Delete NetFlow probe")
                .attr("id", "probe_del_btn_" + nodes[count].id);
            $("#probe_del_btn_" + nodes[count].id).html('<i class="fa fa-minus fa-fw" id="probe_del_icon_' + nodes[count].id + '"></>');
            document.getElementById("probe_del_btn_" + nodes[count].id).addEventListener('click', function (d) { delete_node(d.target.id); }, false);
        }
    }
    function update_table_router() {
        //update_list_node();
        table = d3.select("#router_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'P') continue;
            table_row = table_body.append("tr");
            table_row.attr("id", "router_" + nodes[count].id);
            table_row.append("td").text(nodes[count].hostname);
            table_row.append("td").text(nodes[count].long);
            table_row.append("td").text(nodes[count].lat);
            table_row.append("td").text(nodes[count].address);
            table_row.append("td").text(nodes[count].description);
            action_td = table_row.append("td").attr("class", "col-md-1").attr("align", "center").append("div").attr("class", "btn-group");

            action_td.append("a")  // detail routeru
                .attr("href", "template/router.html").attr("data-toggle", "modal").attr("data-target", "#detailModal")
                .attr("class", "btn btn-xs btn-info").attr("title", "Info about router").attr("id", "router_info_btn_" + nodes[count].id);
            $("#router_info_btn_" + nodes[count].id).html('<i class="fa fa-pencil-square-o fa-fw"></>');

            action_td.append("button")  // smazani routeru
                .attr("type", "button")
                .attr("class", "btn btn-xs btn-danger")
                .attr("title", "Delete router")
                .attr("id", "router_del_btn_" + nodes[count].id);
            $("#router_del_btn_" + nodes[count].id).html('<i class="fa fa-minus fa-fw" id="router_del_icon_' + nodes[count].id + '"></>');
            document.getElementById("router_del_btn_" + nodes[count].id).addEventListener('click', function (d) { delete_node(d.target.id); }, false);
        }
    }

    // funkce pro praci s links, nodes, tables
    function get_new_id_link() {
        new_id = links_count;
        links_count += 1;
        return new_id;
    }
    function get_new_id_node() {
        new_id = nodes_count;
        nodes_count += 1;
        return new_id;
    }
    function update_all_tables() {
        update_table_link();
        update_table_router();
        update_table_probe();
    }

    function load_file(e) {
        var file = e.target.files[0];
        source_file_name = file.name;
        d3.select("#file_name_label").text('File: ' + file.name);
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            parse_geoJson(jQuery.parseJSON(e.target.result));
        };
        reader.readAsText(file);
    }
    // nacte geoJson file, ulozi do interni struktury, ulozi do lokalni pameti
    function parse_geoJson(data) {
        // pokud se pouze inicializuje zobrazeni
        if (data == '') return;
        tmp = source_file_name;
        init_local_variables();
        source_file_name = tmp;

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
        update_all_tables();
    }

    function prepare_router() {
        if (type_action == 'detail') {
            document.getElementById('modal_title').innerHTML = 'Detail router';
            document.getElementById('name_router').value = nodes[current_item_index].hostname;
            document.getElementById('description').value = nodes[current_item_index].description;
            document.getElementById('address').value = nodes[current_item_index].address;
            document.getElementById('longitude').value = nodes[current_item_index].long;
            document.getElementById('latitude').value = nodes[current_item_index].lat;
        }
    }
    function save_router() {
        id = '';
        if (type_action == 'new')
            id = get_new_id_node();
        else
            id = current_item_index;
        hostname = document.getElementById("name_router").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;
        type_node = "R";
        address = document.getElementById("address").value;
        description = document.getElementById("description").value;

        node = {
            id: id,
            hostname: hostname,
            lat: latitude,
            long: longitude,
            type_node: type_node,
            address: address,
            description: description,
            token: ''
        };
        if (type_action == 'new')
            nodes.push(node);
        else
            nodes[current_item_index] = node;

        $('#detailModal').modal('toggle');

        update_all_tables();
    }

    function prepare_probe() {
        if (type_action == 'detail') {
            document.getElementById('modal_title').innerHTML = 'Detail probe';
            document.getElementById('hostname_probe').value = nodes[current_item_index].hostname;
            document.getElementById('description').value = nodes[current_item_index].description;
            document.getElementById('address').value = nodes[current_item_index].address;
            document.getElementById('longitude').value = nodes[current_item_index].long;
            document.getElementById('latitude').value = nodes[current_item_index].lat;
        }
    }
    function save_probe() {
        id = '';
        if (type_action == 'new')
            id = get_new_id_node();
        else
            id = current_item_index;
        hostname = document.getElementById("hostname_probe").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;
        type_node = "P";
        address = document.getElementById("address").value;
        description = document.getElementById("description").value;

        node = {
            id: id,
            hostname: hostname,
            lat: latitude,
            long: longitude,
            type_node: type_node,
            address: address,
            description: description,
            token: ''
        };
        if (type_action == 'new')
            nodes.push(node);
        else
            nodes[current_item_index] = node;

        $('#detailModal').modal('toggle');

        update_all_tables();
    }

    function update_list_router() {
        source_node_box = d3.select("#source_router");
        target_node_box = d3.select("#target_router");
        source_node_box.selectAll("option").remove();
        target_node_box.selectAll("option").remove();

        source_node_box.append("option").attr("value", "").text("");
        target_node_box.append("option").attr("value", "").text("");

        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'R') {
                source_node_box.append("option").attr("value", nodes[count].id).text(nodes[count].hostname);
                target_node_box.append("option").attr("value", nodes[count].id).text(nodes[count].hostname);
            }
        }
    }
    function prepare_link() {
        // predvyplneni list boxu pro routery
        update_list_router();

        if (type_action == 'detail') {
            document.getElementById('modal_title').innerHTML = 'Detail link';
            document.getElementById('name_link').value = links[current_item_index].name;
            document.getElementById('description').value = links[current_item_index].description;
            document.getElementById('source_router').value = links[current_item_index].source;
            document.getElementById('target_router').value = links[current_item_index].target;
            document.getElementById('speed_link').value = links[current_item_index].speed;
        }
    }
    function save_link() {
        id = '';
        if (type_action == 'new')
            id = get_new_id_link();
        else
            id = current_item_index;

        name_link = document.getElementById("name_link").value;
        description = document.getElementById("description").value;
        source = document.getElementById("source_router").value;
        target = document.getElementById("target_router").value;
        speed_link = document.getElementById("speed_link").value;
        channel1 = '';
        channel2 = '';

        link = {
            id: id,
            source: source,
            speed: speed_link,
            channel1: channel1,
            channel2: channel2,
            target: target,
            description: description,
            name: name_link,
            probe: ""
        };

        if (type_action == 'new')
            links.push(link);
        else
            links[current_item_index] = link;

        // uzavreni modalniho okna
        $('#detailModal').modal('toggle');

        update_all_tables();

    }

    function insert_channel_name(data, node_index) {
        channel1 = d3.select("#channel1_select");
        channel2 = d3.select("#channel2_select");
        channel1.selectAll("option").remove();
        channel2.selectAll("option").remove();

        channel1.append("option").attr("value", "").text("");
        channel2.append("option").attr("value", "").text("");

        for (count = 0; count < data.channels.length; count++) {
            channel1.append("option").attr("value", data.channels[count].name).text(data.channels[count].name);
            channel2.append("option").attr("value", data.channels[count].name).text(data.channels[count].name);
        }
    }
    function update_list_probe() {
        probe_list_box = d3.select("#probe_link_select");
        probe_list_box.selectAll("option").remove();
        probe_list_box.append("option").attr("value", "").text("");

        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == 'P') {
                probe_list_box.append("option").attr("value", nodes[count].id).text(nodes[count].hostname);
            }
        }
    }
    function prepare_link_probe() {
        update_list_probe();
    }
    function load_channel_name() {
        if (document.getElementById('probe_link_select').value == '') return;
        id_probe = parseInt(document.getElementById('probe_link_select').value);
        if (nodes[id_probe].token == '') {
            get_token(id_probe);
        }
        else {
            get_channel_name(nodes[id_probe].token, id_probe);
        }
    }
    function save_link_probe() {
        links[current_item_index].probe = document.getElementById('probe_link_select').value;
        links[current_item_index].channel1 = document.getElementById('channel1_select').value;
        links[current_item_index].channel2 = document.getElementById('channel2_select').value;

        update_all_tables();

        // uzavreni modalniho okna
        $('#detailModal').modal('toggle');
    }
    function unmount_link_probe(id) {
        par_par = id.split('_');
        links[parseInt(par_par[3])].probe = '';
        links[parseInt(par_par[3])].channel1 = '';
        links[parseInt(par_par[3])].channel2 = '';
        update_all_tables();
    }
    function delete_node(id) {
        par_par = id.split('_');
        nodes.splice(parseInt(par_par[3]), 1);
        update_all_tables();
    }
    function delete_link(id) {
        par_par = id.split('_');
        links.splice(parseInt(par_par[3]), 1);
        update_all_tables();
    }

    function create_file() {
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";

        // uklada uzly
        for (count = 0; count < nodes.length; count++) {
            curr_node = '{ "geometry": { "type": "Point", "coordinates": [ '
                        + nodes[count].long + ', ' + nodes[count].lat + ' ]},';
            curr_node += '"properties": { "hostname": "' + nodes[count].hostname
                      + '", "id": "' + nodes[count].id
                      + '", "type_node": "' + nodes[count].type_node
                      + '", "description": "' + nodes[count].description
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
                if (nodes[s_count].id == links[count].source) {
                    source_coordinates = '[ ' + nodes[s_count].long + ', ' + nodes[s_count].lat + ' ]';
                    break;
                }
            }

            dest_coordinates = "";
            for (d_count = 0; d_count < nodes.length; d_count++) {
                if (nodes[d_count].id == links[count].target) {
                    dest_coordinates = '[ ' + nodes[d_count].long + ', ' + nodes[d_count].lat + ' ]';
                    break;
                }
            }

            if (links[count].probe != '') { // linka spojuje 2 uzly -> je na ni sonda
                var probe_index = 0;
                for (p_count = 0; p_count < nodes.length; p_count++) {
                    if ((nodes[p_count].id == links[count].probe) && (nodes[p_count].type_node == 'S')) {
                        probe_index = p_count;
                        break;
                    }
                }

                var probe_coordinates = '[' + nodes[probe_index].long + ', ' + nodes[probe_index].lat + ' ]';

                // vytvorim 2 linky
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + probe_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source
                            + '", "target": "' + nodes[probe_index].hostname
                            + '", "channel1": "' + links[count].channel1
                            + '", "channel2": "' + links[count].channel2
                            + '", "speed": "' + links[count].speed
                            + '", "probe": "' + links[count].probe
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" },';
                content += curr_node;

                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + probe_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + nodes[probe_index].hostname
                            + '", "target": "' + links[count].target
                            + '", "channel1": "' + links[count].channel1
                            + '", "channel2": "' + links[count].channel2
                            + '", "speed": "' + links[count].speed
                            + '", "probe": "' + links[count].probe
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" }';
                if (count != links.length - 1) { curr_node += ','; }
                content += curr_node;
            }
            else {
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source
                            + '", "target": "' + links[count].target
                            + '", "channel1": "' + links[count].channel1
                            + '", "channel2": "' + links[count].channel2
                            + '", "speed": "' + links[count].speed
                            + '", "node": "' + links[count].probe
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" }';
                if (count != links.length - 1) { curr_node += ','; }
                content += curr_node;
            }
        }
        content += ']}';    // end
        var blob = new Blob([content], { type: "application/json" });
        var url = URL.createObjectURL(blob);

        var a = document.createElement('a');
        a.download = "backup.geo.json";
        a.href = url;
        a.id = 'save_to_local_a';
        document.getElementById('button_block').appendChild(a);
        document.getElementById('save_to_local_a').click();
    }

// ------------------------------------------------------------------------------------------------------------
}