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
// onclick="geoSetting.getInstance().add_sensor();"
var form_sensor = '<table><tr><td align="right"><p>Nazev: <input id="name_node" name="name_node" type="text"></p></td></tr><tr><td align="right"><p>Zem. delka: <input id="longitude" name="longitude" type="text"></p></td></tr><tr><td align="right"><input id="form_create_sensor" type="submit" value="Vlozit senzor" ></td></tr></table>';

function setting() {
    var nodes = []; // seznam vsech uzlu
    var links = []; // seznam vsech linek mezi uzly
    this.initialize = init;
    this.add_node = insert_node;
    this.add_link = insert_link;
    this.create_geojson_file = create_file;
    this.delete_node = delete_node;
    this.delete_link = delete_link
    
    this.init_sensor_form = init_sensor_form;
    this.add_sensor = insert_sensor;

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
                        + "}";
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function init(id) {
        define_style();

        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani uzlu
        div_form = d3.select(id).append("div");
        table_form = div_form.append("form").attr("id", "node_form").append("table");
        table_form.style("float", "left").attr("id", "input_form_node").style("margin-right", "1cm");
        // 0.radek - nadpis
        table_form.append("tr").append("h3").text("Uzel");

        // 1.radek - nazev
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Nazev: ")
                  .append("input").attr("id", "name_node").attr("name", "name_node").attr("type", 'text');

        // 2.radek - zemepisna delka
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Zem. delka: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text')

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
                  .append("input").attr("type", "submit").attr("value", "Vlozit uzel")
                  .attr("onclick", "geoSetting.getInstance().add_node(this);");

        // -------------------------------------------------------------------------------------------------------------------
        // formular pro vkladani linek
        table_form = div_form.append("form").attr("id", "link_form").append("table")
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
                  .append("select").attr("id", "destination_node").attr("name", "destination_node");

        // 5.radek - cilovy port
        /*
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Cilovy port: ")
                  .append("input").attr("id", "destination_port").attr("name", "destination_port").attr("type", 'text');
        */
        // 6.radek - prazdny
        table_form.append("tr").attr("height", $('tr').eq(1).height()).append("td");

        // 7.radek 
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit linku")
                  .attr("onclick", "geoSetting.getInstance().add_link();");

        d3.select(id).append("hr");
        tables = d3.select(id).append("div").attr("id", "tables_div");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni uzlu
        title = tables
            .append("table")
            .attr("id", "node_setting_result")
            .style("float", "left")
            .style("margin-right", "1cm")
            .attr("border", "1")
            .attr("width", $("#input_form_node").width())
            .append("tbody")
            .append("tr");
        title.append("td").text("Nazev");
        title.append("td").text("Zem. delka");
        title.append("td").text("Zem. sirka");
        title.append("td").text("Typ");
        title.append("td").text("Adresa");
        title.append("td").text("Popis");
        title.append("td").text("Smazat");

        // -------------------------------------------------------------------------------------------------------------------
        // tabulka pro zobrazeni linek
        title_link = tables
             .append("table")
             .attr("id", "link_setting_result")
             .attr("border", "1")
             .attr("width", $("#input_form_link").width())
             .append("tbody")
             .append("tr");
        title_link.append("td").text("Nazev");
        title_link.append("td").text("Zdrojovy uzel");
        title_link.append("td").text("Zdrojovy port");
        title_link.append("td").text("Cilovy uzel");
        title_link.append("td").text("Cilovy port");
        title_link.append("td").text("Smazat");
        title_link.append("td").text("Sonda");

        // -------------------------------------------------------------------------------------------------------------------
        // tlacitko pro vytvoreni exportu
        d3.select(id).append("hr");
        d3.select(id).append("div")
             .append("input").attr("type", "submit").attr("value", "Vytvor soubor")
             .attr("onclick", "geoSetting.getInstance().create_geojson_file();");
        set_validate_rules();
    }

    function init_sensor_form(id) {
        d3.select(id).attr("width", width).attr("height", height);

        div_form = d3.select(id).append("div");
        table_form = div_form.append("form").attr("id", "sensor_form").append("table");

        // 1.radek - nazev
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Nazev: ")
                  .append("input").attr("id", "sensor_name").attr("name", "sensor_name").attr("type", 'text');

        // 2.radek - adresa
        tr1.append("td").attr("align", "right").append("p").text("Adresa: ")
          .append("input").attr("id", "address").attr("name", "address").attr("type", 'text');

        // 3. radek - popis
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Popis: ")
                  .append("input").attr("id", "description").attr("name", "description").attr("type", 'text');

        // 4.radek - zemepisna delka
        tr1.append("td").attr("align", "right").append("p").text("Zem. delka: ")
                  .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text');

        // 5.radek - zemepisna sirka
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Zem. sirka: ")
                  .append("input").attr("id", "latitude").attr("name", "latitude").attr("type", 'text');

        // 6.radek - zdrojovy uzel - doplneni
        tr1.append("td").attr("align", "right").append("p").text("Zdrojovy uzel: ")
                  .append("input").attr("id", "source_node").attr("name", "source_node").attr("type", 'text');

        // 7.radek - zdrojovy port
        tr1 = table_form.append("tr");
        tr1.append("td").attr("align", "right").append("p").text("Zdrojovy port: ")
                  .append("input").attr("id", "source_port").attr("name", "source_port").attr("type", 'text');

        // 8.radek - cilovy uzel - doplneni
        tr1.append("td").attr("align", "right").append("p").text("Cilovy uzel: ")
                  .append("input").attr("id", "target_node").attr("name", "target_node").attr("type", 'text');

        // 9.radek - cilovy port
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Cilovy port: ")
                  .append("input").attr("id", "target_port").attr("name", "target_port").attr("type", 'text');

        // 10.radek - tlacitko
        tr1 = table_form.append("tr");
        tr1.append("td");
        tr1.append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit senzor")
                  .attr("onclick", "geoSetting.getInstance().add_sensor();");

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
                form.submit();
            }
        });

        $("#link_form").validate({
            rules: {
                destination_node: "required",
                //destination_port: "required",
                source_node: "required",
                //source_port: "required",
                name_link: "required"
            },
            messages: {
                destination_node: "Vyberte cil",
                //destination_port: "Vyberte cilovy port",
                source_node: "Vyberte zdroj",
                //source_port: "Vyberte zdrojovy port",
                name_link: "Zadejte nazev linky"
            },
            submitHandler: function (form) {
                // do other things for a valid form
                form.submit();
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

        document.getElementById("name_node").value = "";
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";
        //document.getElementById("type_node").value = "";
        //document.getElementById("address_node").value = "";
        document.getElementById("description_node").value = "";


        node = { name: name, lat: latitude, long: longitude, type_node: type_node, address: address_node, description: description_node };
        nodes.push(node);
        
        if (typeof (Storage) !== "undefined") {
            sessionStorage.nodes = JSON.stringify(nodes);
        } else {
            alert("Local storage isn't support");
        }

        $('#node_setting_result > tbody:last-child')
            .append('<tr id="node_' + name + '"><td>' + name + '</td><td>' + longitude + '</td><td>'
            + latitude + '</td><td>'
            + type_node + '</td><td>'
            + address_node + '</td><td>'
            + description_node + '</td>'
            + '<td align="center"><input type="submit" value="..." id="node_' + name
            + '" onclick="geoSetting.getInstance().delete_node(this.id);"></td></tr>');

        if ($("#node_setting_result").height() > $("#link_setting_result").height()) {
            d3.select("#tables_div").style("height", $("#node_setting_result").height() + "px");
        }
        else {
            d3.select("#tables_div").style("height", $("#link_setting_result").height() + "px");
        }

        update_list();
    }

    function insert_link() {
        if ($('#link_form').valid() == false) {
            return;
        }
        name_link = document.getElementById("name_link").value;
        source = document.getElementById("source_node").value;
        source_port = "";//document.getElementById("source_port").value;
        destination = document.getElementById("destination_node").value;
        destination_port = "";//document.getElementById("destination_port").value;

        document.getElementById("source_node").value = "";
        document.getElementById("destination_node").value = "";
        document.getElementById("name_link").value = "";
        //document.getElementById("source_port").value = "";
        //document.getElementById("destination_port").value = "";

        link = { source_node: source, source_port: source_port, destination_node: destination, destination_port: destination_port, name: name_link };
        links.push(link);

        if (typeof (Storage) !== "undefined") {
            sessionStorage.links = JSON.stringify(links);
        } else {
            alert("Local storage isn't support");
        }

        $('#link_setting_result > tbody:last-child')
            .append('<tr id="link_' + source + '_' + destination + '"><td>' + name_link + '</td><td>' + source + '</td><td>' + source_port
            + '</td><td>' + destination + '</td><td>' + destination_port
            + '</td><td align="center"><input type="submit" value="..." id="link_' + source + '_' + destination
            + '" onclick="geoSetting.getInstance().delete_link(this.id);">'
            + '</td><td align="center"><input type="submit" value="+" id="link_btn_' + name_link + '_' + source + '_' + destination +'">'
            + '</td></tr>');
            
        
        $("#" + "link_btn_"+ name_link + '_' + source + '_' + destination).qtip({
            content: {
                button: 'Close',
                title: name_link,
                text: $('<iframe height="440" width="820" src="template/sensor.html" />')
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
                my: 'bottom center',
                at: 'top center',
                adjust: {
                    screen: true
                }
            },
            style: {
                classes: 'qtip-bootstrap',
                width: 860,
                height: 490
            }
        });

        if ($("#node_setting_result").height() > $("#link_setting_result").height()) {
            d3.select("#tables_div").style("height", $("#node_setting_result").height() + "px");
        }
        else {
            d3.select("#tables_div").style("height", $("#link_setting_result").height() + "px");
        }

    }

    function insert_sensor() {
        if ($('#sensor_form').valid() == false) {
            return;
        }

        // nacteni z HTML5 lokalniho uloziste
        if (typeof (Storage) !== "undefined") {
            links = jQuery.parseJSON(sessionStorage.nodes);
            links = jQuery.parseJSON(sessionStorage.links);
        } else {
            alert("Local storage isn't support");
        }

        // uprava linky -> rozdeleni linky na dve, vlozeni uzlu typu sonda

    }

    function update_list() {
        source_node_box = d3.select("#source_node");

        source_node_box.selectAll("option").remove();
        source_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            source_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }

        destination_node_box = d3.select("#destination_node");

        destination_node_box.selectAll("option").remove();
        destination_node_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            destination_node_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }

    function create_file() {
        alert("Vytvarim soubor...");
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";
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
                if (nodes[d_count].name == links[count].destination_node) {
                    dest_coordinates = '[ ' + nodes[d_count].long + ', ' + nodes[d_count].lat + ' ]';
                    break;
                }
            }

            curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + dest_coordinates + ' ]},';
            curr_node += '"properties": { "source": "' + links[count].source_node
                      + '", "target": "' + links[count].destination_node
                      + '", "target_port": "' + links[count].destination_port
                      + '", "source_port": "' + links[count].source_port
                      + '", "name": "' + links[count].name + '"},';
            curr_node += '"type": "Feature" }';
            if (count != links.length - 1) { curr_node += ','; }
            content += curr_node;
        }

        content += ']}';    // end
        window.open('data:text/json;charset=utf-8,' + escape(content))
    }

    function delete_node(id) {
        var count;
        for (count = 0; count < nodes.length; count++) {
            if (('node_' + nodes[count].name) == id) {
                break;
            }
        }
        nodes.splice(count, 1);
        d3.select("#" + id).remove();
        update_list();
    }

    function delete_link(id) {
        var count;
        for (count = 0; count < links.length; count++) {
            if (('link_' + links[count].source + '_' + links[count].dest) == id) {
                break;
            }
        }
        links.splice(count, 1);
        d3.select("#" + id).remove();
        update_list();
    }
}