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
    var input_form;
    var nodes = [];
    var links = [];
    var current_type;
    var current_item_index;
    this.create_graph = load_graph;
    this.set_data = nacti_data;
    this.load_change = load_local_variable;
    this.initialize = init_graph;
    this.add_input_form = init_input_form;

    // vlozi do stranky formular pro vlozeni souboru s geoJson obsahem
    function init_input_form() {
        input_form = d3.select('#' + id).append("input");

        input_form.attr("type", "file")
                  .attr("id", "input_geo_json_file")
                  .attr("class", "btn-primary");

        document.getElementById('input_geo_json_file')
                .addEventListener('change', readSingleFile, false);

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
        
        force
            .nodes(nodes)
            .links(links)
            .start();

        link = graph_block.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke", function (d) {
                switch (d.speed) {
                    case "100": return "#6f00ff";
                    case "1000": return "#66cdaa";
                    case "10000": return "#ffff66";
                    case "40000": return "#ff4444";
                    case "100000": return "#000000";
                }
            })
            .style("stroke-width", function (d) {
                switch (d.speed) {
                    case "100": return "2px";
                    case "1000": return "4px";
                    case "10000": return "6px";
                    case "40000": return "8px";
                    case "100000": return "10px";
                }
            })
            .attr("title", function (d) { return d.name; })
            .attr("id", function (d) { return d.name; });

        node_g = graph_block.selectAll("g.node")
            .data(nodes, function (d) { return d.name; });
            
        node = node_g.enter().append("g")
                             .attr("class", "node")
                             .attr("title", function (d) { return d.name; })
                             .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
                             .call(force.drag);

        node_c = node.append("circle")
            .attr("r", 20)
            .style("fill", "#eee");            

        node.append("image")
            .attr("xlink:href", function (d) { return (d.type_node == "R") ? "img/router.png" : "img/sensor.png" })
            .attr("x", function (d) { return -25; })
            .attr("y", function (d) { return -25; })
            .attr("height", 50)
            .attr("width", 50);


        $('.link, .node').qtip({
            content: {
                button: 'Close',
                title: function (event, api) {
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
                        for (var count = 0; count < links.length; count++)
                            if (links[count].name == api.elements.target.attr("title")) {
                                current_item_index = count;
                                break;
                            }
                    }
                    save_local_variable();
                    return api.elements.target.attr("title");
                },
                text: $('<iframe height="180" width="640" src="template/data.html" />')
            },
            show: { solo: true },
            hide: 'unfocus',
            position: {
                my: 'left top',
                at: 'right top',
                adjust: {
                    screen: true
                }
            },
            style: {
                classes: 'qtip-bootstrap',
                width: 660,
                height: 230
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
    }

    // ziska pristupove tokeny ke vsem sondam a ulozi do properties
    function get_all_token() {
        for (var count = 0; count < nodes.length; count ++) {
            if (nodes[count].type_node == 'S') { // pouze u uzlu typu sonda
                get_token(count);
            }
        }
    }

    // projde vsechny uzly a linky a pokud je to sonda tak nacte data
    function load_parameter_from_sensors() {
        // prochazi vsehny 
        for (var count = 0; count < nodes.length; count ++) {
            if (nodes[count].type_node == 'S') { // pouze u uzlu typu sonda
                //load_parameter("collector-devel.ics.muni.cz", );
                null;
            }
        }
    }

    // provede update obj pomoci nactenych dat
    function update_sensor(obj, data) {
        null;
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
            },

            error: function (a, b, err) {
                console.log(err);
            },
        });
    }
    // nacte data z konkretni sondy
    function load_parameter(address, type_data) {
        // nastaveni adresy = addresss

        function getResults(t) {
            $.ajax({
                type: "GET",
                url: "https://" + host + "/rest/fmc/analysis/chart", // typ zobrazovaneho grafu
                headers: { "Authorization": "bearer " + t },
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
                    update_sensor(obj, JSON.stringify(msg));
                },
                error: function (a, b, err) {
                    console.log(err);
                },
            });
        }
    }
}