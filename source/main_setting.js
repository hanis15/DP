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
    this.initialize = init;
    this.add_node = insert_node;
    this.add_link = insert_link;
    this.create_geojson_file = create_file;
    this.delete_node = delete_node;
    this.delete_link = delete_link;

    function init(id) {
        // formular pro vkladani uzlu

        div_form = d3.select(id).append("div").style("height", "300px");
        table_form = div_form.append("form").attr("id", "node_form").append("table");
        table_form.style("float", "left").attr("id", "input_form_node");
        // 0.radek
        table_form.append("tr").append("h3").text("Uzel");
        // 1.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Name node: ")
                          .append("input").attr("id", "name_node").attr("name", "name_node").attr("type", 'text');

        // 2.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Longitude: ")
                          .append("input").attr("id", "longitude").attr("name", "longitude").attr("type", 'text')

        // 3.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Latitude: ")
                          .append("input").attr("id", "latitude").attr("name", "latitude").attr("type", 'text');

        // 4.radek
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit uzel")
                  .attr("onclick", "geoSetting.getInstance().add_node(this);");

        // formular pro vkladani linek
        table_form = div_form.append("form").attr("id", "link_form").append("table")
        table_form.attr("id", "input_form_link");
        // 0.radek
        table_form.append("tr").append("h3").text("Linka");
        // 1.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Source: ")
                  .append("select").attr("id", "source_list").attr("name", "source_list");

        // 2.radek
        table_form.append("tr").append("td").attr("align", "right").append("p").text("Destination: ")
                  .append("select").attr("id", "destination_list").attr("name", "destination_list");

        // 3.radek
        table_form.append("tr").attr("height", $('tr').eq(1).height()).append("td");

        // 4.radek 
        table_form.append("tr").append("td").attr("align", "right")
                  .append("input").attr("type", "submit").attr("value", "Vlozit linku")
                  .attr("onclick", "geoSetting.getInstance().add_link();");

        d3.select(id).append("hr")
        tables = d3.select(id).append("div").attr("id", "tables_div");

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
        title.append("td").text("Name");
        title.append("td").text("Longitude");
        title.append("td").text("Latitude");
        title.append("td").text("Smazat");

        // tabulka pro zobrazeni linek
        title_link = tables
             .append("table")
             .attr("id", "link_setting_result")
             .attr("border", "1")
             .attr("width", $("#input_form_link").width())
             .append("tbody")
             .append("tr");
        title_link.append("td").text("Source");
        title_link.append("td").text("Destination");
        title_link.append("td").text("Smazat");

        // tlacitko pro vytvoreni exportu
        d3.select(id).append("hr");
        d3.select(id).append("div")
             .append("input").attr("type", "submit").attr("value", "Vytvor soubor")
             .attr("onclick", "geoSetting.getInstance().create_geojson_file();");

        $("#node_form").validate({
            rules: {
                name_node: "required",
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
                destination_list: "required",
                source_list: "required"
            },
            messages: {
                destination_list: "Vyberte cil",
                source_list: "Vyberte zdroj"
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

        document.getElementById("name_node").value = "";
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";

        node = { name: name, lat: latitude, long: longitude };
        nodes.push(node);

        $('#node_setting_result > tbody:last-child')
            .append('<tr id="node_' + name + '"><td>' + name + '</td><td>' + longitude + '</td><td>'
            + latitude + '</td><td align="center"><input type="submit" value="..." title="node_' + name
            + '" onclick="geoSetting.getInstance().delete_node(this.title);"></td></tr>');

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
        source = document.getElementById("source_list").value;
        destination = document.getElementById("destination_list").value;

        document.getElementById("source_list").value = "";
        document.getElementById("destination_list").value = "";

        link = { source: source, dest: destination };
        links.push(link);

        $('#link_setting_result > tbody:last-child')
            .append('<tr id="link_' + source + '_' + destination + '"><td>' + source + '</td><td>' + destination
            + '</td><td align="center"><input type="submit" value="..." title="link_' + source + '_' + destination
            + '" onclick="geoSetting.getInstance().delete_link(this.title);"></td></tr>');
        if ($("#node_setting_result").height() > $("#link_setting_result").height()) {
            d3.select("#tables_div").style("height", $("#node_setting_result").height() + "px");
        }
        else {
            d3.select("#tables_div").style("height", $("#link_setting_result").height() + "px");
        }

    }

    function update_list() {
        source_list_box = d3.select("#source_list");

        source_list_box.selectAll("option").remove();
        source_list_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            source_list_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }

        destination_list_box = d3.select("#destination_list");

        destination_list_box.selectAll("option").remove();
        destination_list_box.append("option").attr("value", "").text("");
        for (count = 0; count < nodes.length; count++) {
            destination_list_box.append("option").attr("value", nodes[count].name).text(nodes[count].name);
        }
    }

    function create_file() {
        alert("Vytvarim soubor...");
        content = '{ "type": "FeatureCollection", "features": ['; // start
        curr_node = "";
        for (count = 0; count < nodes.length; count++) {
            curr_node = '{ "geometry": { "type": "Point", "coordinates": [ '
                        + nodes[count].long + ', ' + nodes[count].lat + ' ]},';
            curr_node +=  '"properties": { "name": "' + nodes[count].name + '"},';
            curr_node += '"type": "Feature" }';
            if (count != nodes.length - 1) { curr_node += ','; }
            content += curr_node;
        }
        
        if (links.length != 0) { content += ','; }

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
                if (nodes[d_count].name == links[count].dest) {
                    dest_coordinates = '[ ' + nodes[d_count].long + ', ' + nodes[d_count].lat + ' ]';
                    break;
                }
            }

            curr_node = '{ "geometry": { "type": "LineString", "coordinates": [ ' + source_coordinates + ', ' + dest_coordinates + ' ]},';
            curr_node += '"properties": { "source": "' + links[count].source + '", "target": "'
                         + links[count].dest + '"},';
            curr_node += '"type": "Feature" }';
            if (count != links.length - 1) { curr_node += ','; }
            content += curr_node;
        }

        content += ']}';    // end
        window.open('data:text/json;charset=utf-8,' + escape(content))
    }

    function delete_node(title) {
        var count;
        for (count = 0; count < nodes.length; count++) {
            if (('node_' + nodes[count].name) == title) {
                break;
            }
        }
        nodes.splice(count, 1);
        d3.select("#" + title).remove();
        update_list();
    }

    function delete_link(title) {
        var count;
        for (count = 0; count < links.length; count++) {
            if (('link_' + links[count].source + '_' + links[count].dest) == title) {
                break;
            }
        }
        links.splice(count, 1);
        d3.select("#"+title).remove();
        update_list();
    }
}