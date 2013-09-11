module.exports = function(grunt) {
  
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-compress");
  
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
    }
  });
  
  grunt.registerTask("default", ["less", "watch"]);
  grunt.registerTask("package", ["less:all", "compress:pack"]);
  
};
