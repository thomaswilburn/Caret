module.exports = function(grunt) {

  var exec = require("child_process").exec;
  var path = require("path");
  var fs = require("fs");
  
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-compress");
  
  grunt.initConfig({
    less: {
      light: {
        files: {
          "css/caret.css": "css/seed.less",
          "css/caret-dark.css": "css/seed-dark.less"
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
      store: {
        options: {
          archive: "build/caret.zip",
          pretty: true,
          level: 2
        },
        files: [
          {cwd: "build/unpacked", expand: true, src: "**", dest: "/", isFile: true}
        ]
      }
    },
    copy:  ["config/**", "js/**", "css/*.css", "*.html", "require.js", "background.js", "installer.js", "*.png"]
  });
  
  grunt.registerTask("default", ["less", "watch"]);
  grunt.registerTask("prep", ["less", "cleanup", "copyUnpacked"]);
  grunt.registerTask("package", ["prep", "chrome", "webstore", "compress:store"]);
  grunt.registerTask("store", ["prep", "webstore", "compress:store"]);
  grunt.registerTask("crx", ["prep", "chrome"]);
  
  grunt.registerTask("copyUnpacked", "Copies files to the build directory", function() {
    var srcPatterns = grunt.config.get("copy");
    srcPatterns.forEach(function(pattern) {
      var files = grunt.file.expandMapping(pattern, "./build/unpacked", {
        filter: "isFile"
      });
      files.forEach(function(f) {
        grunt.file.copy(f.src[0], f.dest);
      });
    });
  });

  grunt.registerTask("chrome", "Makes a new CRX package", function() {
    var manifest = JSON.parse(fs.readFileSync("./manifest.json"));
    manifest.icons["128"] = "icon-128-inverted.png";
    fs.writeFileSync("./build/unpacked/manifest.json", JSON.stringify(manifest, null, 2));

    //perform the Chrome packaging
    var c = this.async();
    var here = fs.realpathSync(__dirname);

    var chrome = {
      win32: '"' + (process.env["ProgramFiles(x86)"] || process.env.ProgramFiles) + "\\Google\\Chrome\\Application\\chrome.exe" + '"',
      linux: "/opt/google/chrome/google-chrome",
      osx: "Beats me."
    };

    var cmd = [ chrome[process.platform] ];
    cmd.push("--pack-extension=" + path.join(here, "build/unpacked"));
    cmd.push("--pack-extension-key=" + path.join(here, "../Caret.pem"));
    cmd = cmd.join(" ");
    exec(cmd,function(err, out, stderr) {
      if (err) {
        console.log("Unable to run Chrome for CRX packaging.");
        return c();
      }
      fs.renameSync("./build/unpacked.crx", "./build/Caret.crx");
      c();
    });
  });

  grunt.registerTask("webstore", "Prepares the manifest for the web store", function() {
    var manifest = JSON.parse(fs.readFileSync("./manifest.json"));
    delete manifest.update_url;
    delete manifest.key;
    manifest = JSON.stringify(manifest, null, 2);
    fs.writeFileSync("./build/unpacked/manifest.json", manifest);
  });

  grunt.registerTask("cleanup", "Removes the build/unpacked directory", function() {
    var c = this.async();
    exec("rm -rf ./build/*", c);
  });
  
};
