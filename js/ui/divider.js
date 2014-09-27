require([
  'command',
  'util/dom2'
  ], function(command){
  
  // Keep track of the dimensions of the project sidebar

  var xCord, projectWidth;
  
  var project = document.find('.project');
  var divider = document.find('.divider');
  var body = document.find('body');
  
  /*
   * \fn eventListener
   *
   *  Initiate dragging on mouse down.
   */
  divider.on('mousedown', function(e){
    // Don't listen on center button clicks
    if(e.button === 2){
      return;
    }
    // get the initial x coordinates
    xCord = e.screenX;
    projectWidth = project.offsetWidth;
    
    // add the mousemove and mouseup listeners
    body.on('mousemove', moveListener);
    body.on('mouseup', upListener);
    
  });
  
  /*
   * \fn moveListener
   *
   *  Change the project bar width on drag.
   */
  function moveListener(e){
      var diff = e.screenX - xCord;
      projectWidth += diff;
      project.css('width', projectWidth + 'px');
      xCord = e.screenX;
  }

  /*
   * \fn upListener
   *
   *  Remove the mousemove and mouseup listeners on mouse up.
   */
  function upListener(e){
      body.off('mousemove', moveListener, false);
      body.off('mouseup', this, false);
  }
});