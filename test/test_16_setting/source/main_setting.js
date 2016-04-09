// JavaScript source code
var geoSetting = (function () {
    var instance;

    function createInstance() {
        var object = new setting();
        return object;
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

function setting() {
    var nodes = []; // seznam vsech uzlu
    var links = []; // seznam vsech linek mezi uzly
    var current_link_index;

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

    function define_style() {
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = ".ui-tooltip, .qtip{"
                        + "position: absolute;"
                        + "left: -28000px;"
                        + "top: -28000px;"
                        + "display: none;"
                        + "max-width: 900px;"
                        + "min-width: 400px;"
                        + "font-size: 10.5px;"
                        + "line-height: 12px;"
                        + "}"
                        + "form label.error { color:red; }"
                        + "form input.error { border:1px solid red; }"
                        + "table { white-space: nowrap; }";
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function init(id) {
        init_local_variables();
        define_style();

        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani uzlu
        div_form = d3.select(id).append("div").attr("id", "forms_block");
        table_form = div_form.append("form").attr("id", "node_form").append("table").style("width", "45%");
        table_form.style("float", "left").attr("id", "input_form_node").style("margin-right", "1cm");
        // 0.radek - nadpis
        table_form.append("tr").append("h3").text("Uzel");

        // 1.radek - nazev
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Nazev: ")
                  .append("input").attr("id", "name_node").attr("name", "name_node").attr("type", 'text');

        // 2.radek - zemepisna delka
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zem. delka: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text');

        // 3.radek - zemepisna sirka
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zem. sirka: ")
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
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Popis: ")
          .append("input").attr("id", "description_node").attr("name", "description_node").attr("type", 'text');

        // 7.radek - tlacitko
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit uzel");
                  //.attr("onclick", "geoSetting.getInstance().add_node(this);");

        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani linek
        table_form = div_form.append("form").attr("id", "link_form").append("table").style("width", "45%")
        table_form.attr("id", "input_form_link");
        // 0.radek - nadpis
        table_form.append("tr").append("h3").text("Linka");

        // 1.radek - nazev
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Nazev: ")
          .append("input").attr("id", "name_link").attr("name", "name_link").attr("type", 'text');

        // 2.radek - zdrojovy uzel
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zdroj: ")
                  .append("select").attr("id", "source_node").attr("name", "source_node");

        // 3.radek - zdrojovy port
        /*
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zdrojovy port: ")
          .append("input").attr("id", "source_port").attr("name", "source_port").attr("type", 'text');
        */
        // 4 radek - cilovy uzel
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Cil: ")
                  .append("select").attr("id", "target_node").attr("name", "target_node");

        // 5.radek - cilovy port
        /*
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Cilovy port: ")
                  .append("input").attr("id", "target_port").attr("name", "target_port").attr("type", 'text');
        */
        // 6.radek - prazdny
        table_form.append("tr").attr("height", $('tr').eq(1).height()).append("td");

        // 7.radek 
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit linku");
                  //.attr("onclick", "geoSetting.getInstance().add_link();");

        d3.select(id).append("hr");
        tables = d3.select(id).append("div").attr("id", "tables_block");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni uzlu
        tables.append("h3").text("Uzly");
        title = tables
            .append("table")
            .attr("class", "table table-hover")
            .attr("id", "node_setting_result")
            .style("float", "left")
            .style("margin-right", "1cm")
            .attr("border", "1")
            .attr("width", $("#input_form_node").width());
        table_head = title.append("thead").append("tr");
        table_head.append("th").text("Nazev");
        table_head.append("th").text("Zem. delka");
        table_head.append("th").text("Zem. sirka");
        table_head.append("th").text("Typ");
        table_head.append("th").text("Adresa");
        //table_head.append("td").text("Popis");
        table_head.append("th").text("Smazat");

        update_table_node();

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni linek
        tables.append("h3").text("Linky");
        title_link = tables
             .append("table")
             .attr("class", "table table-hover")
             .attr("id", "link_setting_result")
             .attr("border", "1")
             .attr("width", $("#input_form_link").width());
        table_head = title_link.append("thead").append("tr");
        table_head.append("th").text("Nazev");
        table_head.append("th").text("Zdrojovy uzel");
        table_head.append("th").text("Zdrojovy port");
        table_head.append("th").text("Cilovy uzel");
        table_head.append("th").text("Cilovy port");
        table_head.append("th").text("Smazat");
        table_head.append("th").text("Sonda");

        update_table_link();

        // -------------------------------------------------------------------------------------------------------------------
        // tlacitko pro vytvoreni exportu
        d3.select(id).append("hr");
        d3.select(id).append("div").attr("id", "button_block")
             .append("input").attr("type", "submit").attr("value", "Vytvor soubor")
             .attr("onclick", "geoSetting.getInstance().create_geojson_file();");
        set_validate_rules();

        //document.onhaschange(alert("zmeneno!!!!"));
    }

    function init_sensor_form(id) {
        d3.select(id).attr("width", width).attr("height", height);

        div_form = d3.select(id).append("div");
        table_form = div_form.append("form").attr("id", "sensor_form").append("table");

        // 1.radek - nazev, listbox s existujicima sondama
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Nazev: ")
                  .append("input").attr("id", "sensor_name").attr("name", "sensor_name").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Sonda: ")
          .append("select").attr("id", "sensor_node").attr("name", "sensor_node").attr("onchange", "geoSetting.getInstance().prepopulation_list_sensor();");

        // 2. radek - popis, adresa
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Popis: ")
                  .append("input").attr("id", "description").attr("name", "description").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Adresa: ")
                  .append("input").attr("id", "address").attr("name", "address").attr("type", 'text');

        // 3.radek - zemepisna delka, sirka
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Zem. delka: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Zem. sirka: ")
                  .append("input").attr("id", "latitude").attr("name", "latitude").attr("type", 'text');

        // 4.radek - zdrojovy uzel, cilovy uzel
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Zdrojovy uzel: ")
                  .append("input").attr("id", "source_node").attr("name", "source_node").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Cilovy uzel: ")
          .append("input").attr("id", "target_node").attr("name", "target_node").attr("type", 'text');


        // 5.radek - zdrojovy port, cilovy port
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Zdrojovy port: ")
                  .append("input").attr("id", "source_port").attr("name", "source_port").attr("type", 'text');
        tr1.append("td").attr("align", "right").append("p").text("Cilovy port: ")
                  .append("input").attr("id", "target_port").attr("name", "target_port").attr("type", 'text');

        // 6.radek - tlacitko
        tr1 = table_form.append("tr");
        tr1.append("td");
        tr1.append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit senzor")
                  .attr("onclick", "geoSetting.getInstance().add_sensor();");

        load_local_variable();
        if (typeof (Storage) !== "undefined") {
            current_link_index = parseInt(sessionStorage.curr_link_index);
        } else {
            alert("Local storage isn't support");
        }

        update_list_sensor();

        d3.select("#target_node")
            .attr("value", links[current_link_index].target_node)
            .attr("readonly", "readonly");
        d3.select("#source_node")
            .attr("value", links[current_link_index].source_node)
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
                sensor_name: "Vlozte nazev",
                address: "Vlozte adresu sondy",
                latitude: {
                    required: "Vlozte zemepisnou sirku",
                    number: "Hodnota musi byt ciselna"
                },
                longitude: {
                    required: "Vlozte zemepisnou delku",
                    number: "Hodnota musi byt ciselna"
                },
                source_port: "Vlozte nazev pro linku ve smeru ke zdrojovemu uzlu",
                target_port: "Vlozte nazev pro linku ve smeru k cilovemu uzlu"
            },
            submitHandler: function (form) {
                // do other things for a valid form
                form.submit();
            }
        });

    }

    function set_validate_rules() {
        $("#node_form").validate({
            rules: {
                name_node: "required",
                //type_node: "required",
                address_node: "required",
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
                name_node: "Vlozte nazev",
                type_node: "Vyberte typ uzlu",
                //address_node: "Vlozte adresu uzlu",
                latitude: {
                    required: "Vlozte zemepisnou sirku",
                    number: "Hodnota musi byt ciselna"
                },
                longitude: {
                    required: "Vlozte zemepisnou delku",
                    number: "Hodnota musi byt ciselna"
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
                name_link: "required"
            },
            messages: {
                target_node: "Vyberte cil",
                //target_port: "Vyberte cilovy port",
                source_node: "Vyberte zdroj",
                //source_port: "Vyberte zdrojovy port",
                name_link: "Zadejte nazev linky"
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

        $('#node_form')[0].reset();
        
        node = {
            name: name,
            lat: latitude,
            long: longitude,
            type_node: type_node,
            address: address_node,
            description: description_node,
            //source_node: source_node,
            //source_port: source_port,
            //target_node: target_node,
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

        $('#link_form')[0].reset();

        link = {
            source_node: source,
            source_port: source_port,
            target_node: target,
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

        node = {
            name: name,
            lat: latitude,
            long: longitude,
            type_node: type_node,
            address: address_node,
            description: description_node,
        };

        links[current_link_index].source_port = source_port;
        links[current_link_index].target_port = target_port;
        links[current_link_index].node = name;

        nodes.push(node);

        save_local_variable();
        parent.closeIFrame();
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
        curr_val = sensor_node_box = document.getElementById("sensor_node").value;

        for (n in nodes) {
            if (n.name == curr_val) {
                document.getElementById("sensor_name").value = n.name;
                document.getElementById("latitude").value = n.lat;
                document.getElementById("longitude").value = n.long;
                document.getElementById("address").value = n.address;
                document.getElementById("description").value = n.description; 
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
            table_row.append("td").text(nodes[count].type_node);
            table_row.append("td").text(nodes[count].address);
            //table_row.append("td").text(n.description);
            table_row.append("td").attr("align", "center").append("input")
                .attr("type", "submit")
                .attr("value", "...")
                .attr("id", "node_" + count + "_del")
                .attr("onclick", 'geoSetting.getInstance().delete_node(this.id);');
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

    function update_table_link() {
        table = d3.select("#link_setting_result");
        table.selectAll("tbody").remove();

        table_body = table.append("tbody");
        for (var count = 0; count < links.length; count++) {
            table_row = table_body.append("tr");
            table_row.attr("id", "link_" + count);
            table_row.append("td").text(links[count].name);
            table_row.append("td").text(links[count].source_node);
            table_row.append("td").text(links[count].source_port);
            table_row.append("td").text(links[count].target_node);
            table_row.append("td").text(links[count].target_port);
            table_row.append("td").attr("align", "center").append("input")
                .attr("type", "submit")
                .attr("value", "...")
                .attr("id", "link_" + count + "_del")
                .attr("onclick", 'geoSetting.getInstance().delete_link(this.id);');
            table_row.append("td").attr("align", "center").append("input")
                .attr("type", "submit")
                .attr("value", "+")
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
                        return my_id[2];
                    },
                    text: function () {return '<iframe height="450" width="820" src="template/sensor.html" />'; }//'Loading...',
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
        alert("Vytvarim soubor...");
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";

        // uklada uzly
        for (count = 0; count < nodes.length; count++) {
            curr_node = '{ "geometry": { "type": "Point", "coordinates": [ '
                        + nodes[count].long + ', ' + nodes[count].lat + ' ]},';
            curr_node += '"properties": { "name": "' + nodes[count].name
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
                if (nodes[s_count].name == links[count].source_node) {
                    source_coordinates = '[ ' + nodes[s_count].long + ', ' + nodes[s_count].lat + ' ]';
                    break;
                }
            }

            dest_coordinates = "";
            for (d_count = 0; d_count < nodes.length; d_count++) {
                if (nodes[d_count].name == links[count].target_node) {
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
                curr_node += '"properties": { "source": "' + links[count].source_node
                            + '", "target": "' + nodes[sensor_index].name
                            + '", "target_port": "' + links[count].target_port
                            + '", "source_port": "' + links[count].source_port
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" },';
                content += curr_node;

                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + sensor_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + nodes[sensor_index].name
                            + '", "target": "' + links[count].target_node
                            + '", "target_port": "' + links[count].target_port
                            + '", "source_port": "' + links[count].source_port
                            + '", "name": "' + links[count].name + '"},';
                curr_node += '"type": "Feature" }';
                if (count != links.length - 1) { curr_node += ','; }
                content += curr_node;
            }
            else {
                curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + dest_coordinates + ' ]},';
                curr_node += '"properties": { "source": "' + links[count].source_node
                            + '", "target": "' + links[count].target_node
                            + '", "target_port": "' + links[count].target_port
                            + '", "source_port": "' + links[count].source_port
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