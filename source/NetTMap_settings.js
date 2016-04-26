var NetTMap_setting = (function () {
    var graph_instance;

    // vrati instanci konkretniho typu, nebo vytvori novou
    function create() {
        graph_instance = new geoSetting();
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


function geoSetting() {
    var path_hw_type = 'sensor_type.json'; // cesta k souboru s typem hardware sond

    var nodes = []; // seznam vsech uzlu
    var links = []; // seznam vsech linek mezi uzly
    var current_link_index;
    var speed_table = {};

    this.initialize = init;
    this.add_node = insert_node;
    this.add_link = insert_link;
    this.create_geojson_file = create_file;
    this.delete_node = delete_node;
    this.delete_link = delete_link;
    this.prepopulation_list_sensor = prepopulation_list;
    this.save_local_variable = save_local_variable;
    this.load_local_variable = load_local_variable;
    this.update = update_all;
    
    this.init_sensor_form = init_sensor_form;
    this.add_sensor = insert_sensor;

    function update_all() {
        load_local_variable();
        update_table_link();
        update_table_node();
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
        } else {
            alert("Local storage isn't support");
        }
    }

    function save_local_variable() {
        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
            sessionStorage.links = JSON.stringify(links);
        } else {
            alert("Local storage isn't support");
        }

    }

    function init(id) {
        init_local_variables();

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
                  .append("input").attr("type", "submit").attr("value", "Insert node").attr("class", "btn-primary");
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
                  .append("input").attr("type", "submit").attr("value", "Insert link").attr("class", "btn-primary");
                  //.attr("onclick", "NetTMap_setting.getInstance().add_link();");

        d3.select('#' + id).append("hr");
        tables = d3.select('#' + id).append("div").attr("id", "tables_block");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni uzlu
        tables.append("h3").text("Nodes");
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
        // tlacitko pro vytvoreni exportu
        d3.select('#' + id).append("hr");
        d3.select('#' + id).append("div").attr("id", "button_block")
             .append("input").attr("type", "submit").attr("value", "Create geoJson file").attr("class", "btn-success")
             .attr("onclick", "NetTMap_setting.getInstance().create_geojson_file();");
        set_validate_rules();

        //document.onhaschange(alert("zmeneno!!!!"));
    }

    function init_sensor_form(id) {
        d3.select('#' + id).attr("width", width).attr("height", height);

        div_form = d3.select('#' + id).append("div");
        table_form = div_form.append("form").attr("id", "sensor_form").append("table");

        // 1.radek - nazev, listbox s existujicima sondama
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Name: ")
                  .append("input").attr("id", "sensor_name").attr("name", "sensor_name").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("NetFlow probe: ")
          .append("select").attr("id", "sensor_node").attr("name", "sensor_node").attr("onchange", "NetTMap_setting.getInstance().prepopulation_list_sensor();");

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
        tr1.append("td").attr("align", "right").append("p").text("Hardware: ")
                  .append("select").attr("id", "hardware").attr("name", "hardware");
        load_hw_type();
        tr1.append("td");


        // 7.radek - tlacitko
        tr1 = table_form.append("tr");
        tr1.append("td");
        tr1.append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Insert NetFlow probe").attr("class", "btn-primary")
                  .attr("onclick", "NetTMap_setting.getInstance().add_sensor();");

        load_local_variable();
        if (typeof (Storage) !== "undefined") {
            current_link_index = parseInt(sessionStorage.curr_link_index);
        } else {
            alert("Local storage isn't support");
        }

        update_list_sensor();

        d3.select("#target_node")
            .attr("value", links[current_link_index].target)
            .attr("readonly", "readonly");
        d3.select("#source_node")
            .attr("value", links[current_link_index].source)
            .attr("readonly", "readonly");

        // validace formulare
        $("#sensor_form").validate({
            rules: {
                sensor_name: "required",
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
                sensor_name: "Insert name",
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

    // nacte do listboxu jmena HW zarizeni z json souboru
    function load_hw_type() {
        d3.json(path_hw_type, load_type);

        function load_type(error, data) {
            if (error) throw error;

            var sensor_select_input = d3.select('#hardware');
            sensor_select_input.append("option").attr("value", "").text("");
            for (var t_count = 0; t_count < data.hardware.length; t_count++) {
                sensor_select_input.append("option").attr("value", data.hardware[t_count].pn).text(data.hardware[t_count].pn);
            }
        }
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
        
        update_list();
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

    function insert_sensor() {
        if ($('#sensor_form').valid() == false) {
            return;
        }
        // uprava linky -> rozdeleni linky na dve, vlozeni uzlu typu sonda
        name = document.getElementById("sensor_name").value;
        latitude = document.getElementById("latitude").value;
        longitude = document.getElementById("longitude").value;
        type_node = "S";//document.getElementById("type_node").value;
        address_node = document.getElementById("address").value;
        description_node = document.getElementById("description").value;
        source_node = document.getElementById("source_node").value;
        source_port = document.getElementById("source_port").value;
        target_node = document.getElementById("target_node").value;
        target_port = document.getElementById("target_port").value;
        sensor_node = document.getElementById("sensor_node").value;
        hardware = document.getElementById("hardware").value;

        node = {};
        if (sensor_node == "") {
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
                if (nodes[s_count].name == sensor_node) {
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

        links[current_link_index].source_port = source_port;
        links[current_link_index].target_port = target_port;
        links[current_link_index].node = name;

        save_local_variable();
        parent.closeQTip();
    }

    function update_list_sensor() {
        sensor_node_box = d3.select("#sensor_node");

        sensor_node_box.selectAll("option").remove();
        sensor_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            if (nodes[count].type_node == "S")
                sensor_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }

    function prepopulation_list() {
        curr_val = document.getElementById("sensor_node").value;

        for (s_count = 0; s_count < nodes.length; s_count++) {
            if (nodes[s_count].name == curr_val) {
                document.getElementById("sensor_name").value = nodes[s_count].name;
                document.getElementById("latitude").value = nodes[s_count].lat;
                document.getElementById("longitude").value = nodes[s_count].long;
                document.getElementById("address").value = nodes[s_count].address;
                document.getElementById("description").value = nodes[s_count].description;
                document.getElementById("hardware").value = nodes[s_count].hw;
                break;
            }
        }
    }

    function update_list() {
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

    function update_table_node() {
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
                    return "Sensor";
                else
                    return "Sensor (" + nodes[count].hw + ')';
            });
            table_row.append("td").text(nodes[count].address);
            //table_row.append("td").text(n.description);
            table_row.append("td").append("input").attr("align", "center")
                .attr("type", "submit")
                .attr("value", "...")
                .attr("class", "btn-danger")
                .attr("id", "node_" + count + "_del")
                .attr("onclick", 'NetTMap_setting.getInstance().delete_node(this.id);');
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
                .attr("id", "link_" + count + "_del")
                .attr("onclick", 'NetTMap_setting.getInstance().delete_link(this.id);');
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
                    text: function () {return '<iframe height="430" width="820" src="template/sensor.html" />'; }//'Loading...',
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
                var sensor_index = 0;
                for (p_count = 0; p_count < nodes.length; p_count++) {
                    if ((nodes[p_count].name == links[count].node) && (nodes[p_count].type_node == 'S')) {
                        sensor_index = p_count;
                        break;
                    }
                }

                var sensor_coordinates = '[' + nodes[sensor_index].long + ', ' + nodes[sensor_index].lat + ' ]';

                // vytvorim 2 linky
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + sensor_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source
                            + '", "target": "' + nodes[sensor_index].name
                            + '", "channel1": "' + links[count].source_port
                            + '", "channel2": "' + links[count].target_port
                            + '", "speed": "' + links[count].speed
                            + '", "node": "' + links[count].node
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" },';
                content += curr_node;

                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + sensor_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + nodes[sensor_index].name
                            + '", "target": "' + links[count].target
                            + '", "channel1": "' + links[count].target_port
                            + '", "channel2": "' + links[count].source_port
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
                            + '", "channel1": "' + links[count].source_port
                            + '", "channel2": "' + links[count].target_port
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

    function delete_node(id) {
        var count;
        for (count = 0; count < nodes.length; count++) {
            if ('node_' + count + '_del' == id) {
                break;
            }
        }
        nodes.splice(count, 1);
        d3.select("#" + id).remove();
        update_list();
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
        update_list();
        update_table_link();
    }
}