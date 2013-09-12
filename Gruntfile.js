module.exports = function(grunt) {

  var exec = require("child_process").exec;
  var path = require("path");
  var fs = require("fs");
  
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-contrib-copy");
  
  grunt.initConfig({
    less: {
      all: {
        files: {
          "css/editor.css": "css/seed.less"
        }
      }
    },
    watch: {
      css: {
        files: ["css/*.less"],
        tasks: ["less"]
      },
      options: {
        spawn: false
      }
    },
    compress: {
      pack: {
        options: {
          archive: "build/caret.zip",
          pretty: true
        },
        files: {
          "/": ["config/**", "js/**", "css/*.css", "*.html", "manifest.json", "require.js", "background.js", "*.png"]
        }
      }
    },
    copy: {
      unpacked: {
        dest: "build/unpacked/",
        src: ["config/**", "js/**", "css/*.css", "*.html", "manifest.json", "require.js", "background.js", "*.png"]
      }
    }
  });
  
  grunt.registerTask("default", ["less", "watch"]);
  grunt.registerTask("package", ["less:all", "compress:pack", "copy:unpacked", "crx"]);

  grunt.registerTask("crx", "Makes a new CRX package", function() {
    var manifest = JSON.parse(fs.readFileSync("./build/unpacked/manifest.json"));
    manifest.icons["128"] = "icon-128-inverted.png";
    fs.writeFileSync("./build/unpacked/manifest.json", JSON.stringify(manifest, null, 2));

    //perform the Chrome packaging
    var c = this.async();
    var here = fs.realpathSync(__dirname);

    var chrome = {
      win32: '"%LOCALAPPDATA%/Google/Chrome SxS/Application/chrome.exe"',
      linux: "",
      osx: ""
    }

    var cmd = [ chrome[process.platform] ];
    cmd.push("--pack-extension=" + path.join(here, "build/unpacked"));
    cmd.push("--pack-extension-key=" + path.join(here, "../Caret.pem"));
    exec(cmd.join(" "),function(err, out, stderr) {
      if (err) {
        console.log(stderr);
      }
      fs.renameSync("./build/unpacked.crx", "./build/Caret.crx");
      exec("rm -rf ./build/unpacked");
      c();
    });
  });
  
};
