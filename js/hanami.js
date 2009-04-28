/*
 Hanami
 Author: Kyle Banker (http://www.kylebanker.com)
 Date: April 22, 2009 

 (c) Creative Commons 2009
 http://creativecommons.org/licenses/by-sa/2.5/
*/

// Namespace for Hanami objects.
var Hanami = {};

// Set the rate of freefall based on the level. This game assumes 10 levels.
// Modify this function to your liking.
Hanami.Rate = function(level) {
  return 900 - level * 80;
};

// Field class, to keep track of the data in the game field.
Hanami.Field = function(options) {
  this.blockDiameter = options.diameter;

  this.gameField   = $(options.gameFieldId);

  this.matrix      = [];

  this.initialize();
};

Hanami.Field.prototype = {

  initialize: function() {
    this.setupMatrix();
  },

  // Clears out the game field.
  teardown: function() {
    this.gameField.children().fadeOut(200);
  },

  // The matrix is empty at the beginning of the game.
  setupMatrix: function() {
    for(var i=1; i<=20; i++) {
      this.matrix[i] = [];
      for(var j=1; j<=10; j++) {
        this.matrix[i][j] = false;
      }
    }
  },

  // Stores a tetrad and its coordinates in the game matrix.
  storeCoordinates: function(xy, transform, tetrad) {
    var newCoordinates = this.getCoordinates(xy, transform);
    
    for(var i=0; i<=3; i++) {
      var c = newCoordinates[i];
      this.matrix[c[0]][c[1]] = jQuery(tetrad[i]);
    }
  },

  // Returns the number of rows cleared.
  clearRows: function() {
    var rowsCleared = [];  

    // First clear any complete rows...
    for(var y=20; y >= 1 ; y--) {
      var x = 1;
      while(x <= 10 && this.matrix[x][y]) {
        x++;
      }
      if(x == 11) {
        rowsCleared.unshift(y);
        this.removeRow(y);
      }
    }

    // Then move the elements downward.
    for(var i=0; i < rowsCleared.length; i++) {
      this.moveElementsDown(rowsCleared[i] - 1);
    }

    return rowsCleared.length;
  },

  // Remove a row from the field.
  removeRow: function(row) {
    for(x=1; x <= 10; x++) {
      this.matrix[x][row].fadeOut(200);  
      this.matrix[x][row] = false;
    }

  },

  // Moves all rows above the specified row down by one.
  moveElementsDown: function(row) {
    for(var y=row; y >= 1; y--) {
      for(var x=1; x<=10; x++) {

        // If there's an element here, move it down.
        if(this.matrix[x][y]) {
         
        var left = this.getPx([x, y + 1], null, 'left');
        var top  = this.getPx([x, y + 1], null, 'top');
        this.matrix[x][y].animate({left: left, top: top}, 200);
        this.matrix[x][y + 1] = this.matrix[x][y];
        this.matrix[x][y]     = this.matrix[x][y - 1];
        }
      }
     }
  },

  // Get coordinates for absolutely positioning the element.
  getPx: function(xy, currentXY, plane) {
     var axisIndex = (plane == 'left') ? 0 : 1;
     var scalar    = this.blockDiameter * (xy[axisIndex] - 1);
     if(currentXY !== null) {
       scalar += this.blockDiameter * (currentXY[axisIndex] - 1);
     }
     return scalar + 'px';
  },

  // Inserts text into the gamefield.
  insert: function(text) {
    this.gameField.append(text);
  },
          
  // Use the position of the tetrad to calcualte the
  // gamefield coordinates of each its blocks.
  getCoordinates: function(coord, transform) {
    var result  = [];
    for(var i=0; i <= 3; i++) {
      var xy = [];
      xy.push(transform[i][0] + coord[0] - 1);
      xy.push(transform[i][1] + coord[1] - 1);
      result.push(xy);
    }

    return(result);
  },

  // Takes a coordinate and a transform, and returns true if that 
  // transform at the given coordinate is permitted.
  isPermitted: function(coord, transform) {
    var newCoordinates = this.getCoordinates(coord, transform);
    

    for(var i=0; i<=3; i++) {
      var coordinate = newCoordinates[i];
      
      // Is the tetrad is out of bounds?
      if(coordinate[0] < 1 || coordinate[0] > 10 || coordinate[1] > 20) {
        return false;
      }

      // Or is it touching another tetrad?
      if(this.matrix[coordinate[0]][coordinate[1]]) {
        return false;
      }
    } 
    
    return true;
  },

  // The logic here is a bit simplistic, but it's a safe
  // bet that 99% of players have failed at this point.
  gameOver: function(callback) {
    for(var x=2; x <= 6; x++) {
      if(this.matrix[x][2] || this.matrix[x][1]) {
        return this.endGame(callback);  
      }
    }

    return false;
  },

  // Show the user that the game is over.
  endGame: function(callback) {
    
    // End-of-game animation goes here. Invokes callback.
    $('.block').animate({width:'2px', height: '2px'}, 
      600, function() {

      $('.block').animate({top: '480px'}, 
          1000, callback);
    });

    return true;
  }
  
};


// Tetrad class
Hanami.Tetrad = function(name, options) {
  // The name of the tetrad; one of i, l, j, o, s, t, z.
  this.name            = name;
  
  // Starting position for the tetrad.
  this.currentXY       = options.initial;

  // An array of possible transforms.
  this.transforms      = options.transforms;
 
  // A reference to the game field object.
  this.field           = options.field;

  // Pointer to the current transform.
  this.transformIndex  = null;

  // Stores the current level, which determines fall speed.
  this.level           = options.level;

  // Call this method on teardown.
  this.callback        = options.callback;

  // Initialize this new tetrad.
  this.initialize();
};

Hanami.Tetrad.prototype = {
 
  initialize: function() {
    // Create the tetrad...
    this.createTetrad();

    // apply the first transform...
    this.transform();

    // add behavior to allow for user control...
    this.addEvents();

    // and release it.
    this.startFalling(this.teardown);
  },

  // Stop falling, store the tetrad's location, and execute callback.
  teardown: function() {
    $(document).unbind('keydown');
    $(this).stopTime();

    this.field.storeCoordinates(this.currentXY, 
        this.transforms[this.transformIndex], this.reference);

    this.callback();
  },

  // Creates a new tetrad, adds it to the dom, and positions it.
  createTetrad: function() {
    var id = Math.floor(Math.random() * 100000);
    var field = this.field.insert(
           "<div class='block " + this.name + ' ' + id + "'></div>" +
           "<div class='block " + this.name + ' ' + id + "'></div>" +
           "<div class='block " + this.name + ' ' + id + "'></div>" +
           "<div class='block " + this.name + ' ' + id + "'></div>");

    this.reference = $('.' + id + '');
  },

  // Apply the next available transform.
  transform: function() {
    // Get the next transform.
    var index        = this.getNextTransformIndex();
    var newTransform = this.transforms[index];
    // Get the coordinates for the next transform.
    var newCoordinates = 
      this.field.getCoordinates(this.currentXY, newTransform);
    // If the new coordinates are permitted...
    if(this.field.isPermitted(this.currentXY, newTransform)) {
      
      // Set the new coordinates...
      this.transformIndex = index;

      // And move the blocks accordingly.
      var blocks = this.reference;
      for(var i=0; i<=3; i++) {
        var block  = jQuery(blocks[i]);
        this.moveElement(block, newTransform[i]);
      }
    }
  },

  // Add all movement events to the tetrad object.
  addEvents: function() {
    var context = this;
    
    // Bind a new set of events.
    $(document).bind('keydown', function(e) {
     var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;

       switch(key) {

       case 38: // Up arrow 
         context.transform();
         break;

       case 37: // Left arrow 
         context.moveTetrad('left');
         break;
       
       case 39: // Right arrow 
         context.moveTetrad('right');
         break;

       case 40: // Down arrow 
         context.moveTetrad('down');
         break;

       case 32:
         while(context.moveTetrad('down')) {
           // Do nothing.
         }
      }

   });
  },

  // Start advancing
  startFalling: function(teardown) {
    context  = this;              

    var rate = Hanami.Rate(this.level);

    // Uses the JQuery Timers library to simplify. 
    $(this).everyTime(rate, function() {
        var result = this.moveTetrad('down');
        if(result === false) {
          context.teardown();
        }
    });
  },

  // If possible, move the tetrad in the specified direction.
  moveTetrad: function(direction) {
    var newXY = this.getNewXY(direction);
    if(this.field.isPermitted(newXY, this.transforms[this.transformIndex])) {
      this.currentXY = newXY;
      for(i=0; i<=3; i++) {
        this.moveElement(jQuery(this.reference[i]), 
            this.transforms[this.transformIndex][i]);
      }
      return true;
    }
    return false;
  },

  // Given a direction, return the new coordinate.
  getNewXY: function(direction) {
    switch(direction) {
      case 'down':
        return [this.currentXY[0], this.currentXY[1] + 1];
      case 'left':
        return [this.currentXY[0] - 1, this.currentXY[1]];
      case 'right':
        return [this.currentXY[0] + 1, this.currentXY[1]];
     }
  },

  // Moves element to the specified position.
  moveElement: function(element, xy) {
    var left = this.field.getPx(xy, this.currentXY, 'left');
    var top  = this.field.getPx(xy, this.currentXY, 'top');

    // JQuery chaining here...
    element.hide().
      css({left:null, 'top':null}).
      css({left:left, 'top':top}).
      show();
  },

  // Grab the next transform to apply.
  getNextTransformIndex: function() {
    var lastIndex   = this.transforms.length - 1;
    
    // If the transform index is null or surpasses the bounds...
    if((this.transformIndex === null) || 
        (this.transformIndex + 1 > lastIndex)) {

      return 0;
    }
    
    // Otherwise, increment.
    else {
      return this.transformIndex + 1;
    }
  }
  
};


/* Hanami class, which drives the game. */
Hanami.Game = function(options) {

  this.definitions = options.definitions;

  this.blockDiameter = options.blockDiameter;
 
  this.gameFieldId = options.gameFieldId;

  this.tetradNames = ['o', 'i', 't', 'l', 'j', 'z', 's'];

  this.score       = 0;

  this.lines       = 0;

  this.level       = 0;

  this.initialize();
};

Hanami.Game.prototype = {

  initialize: function() {
    this.createNewField();
    this.initializeLevel(this.insertNewTetrad.bind(this));
  },

  createNewField: function() { 
    this.field = new Hanami.Field({diameter: this.blockDiameter, 
      gameFieldId: this.gameFieldId});
  },

  // Callback after tetrad finishes.
  next: function() {
    var linesCleared = this.field.clearRows();
    this.updateStatus(linesCleared);

    if(!(this.field.gameOver(this.displayGameOver.bind(this)))) {
      
      // Inserts a new tetrad and updates the level.
      this.initializeLevel(this.insertNewTetrad.bind(this));
    }
  },

  // End the game and ask the user to restart. 
  displayGameOver: function() {
    $('#gameOver').fadeIn();
    $(this).oneTime(3000, function() {
       document.location.reload();
     }
    );
  },

  // Update score, lines cleared, and level, if needed.
  updateStatus: function(lines) {
    this.score += lines == 1 ? 50 : (50 * (lines - 1) * lines);
    this.lines += lines;
    $('#score').html(this.score);
    $('#lines').html(this.lines);
  },

  // Initialize a new field and start new level.
  initializeLevel: function(callback) {
    if((this.lines / 10) >= this.level) {
      this.level += 1;
      this.field.teardown();

      this.createNewField();
      $('#displayLevel').html(this.level);
      this.displayNewLevel(callback);
    }
    else {
      callback();
    }

  },

  // Displays some nice intro text at the beginning of each level.
  displayNewLevel: function(callback) {
    var context = this;
    var time    = this.level == 1 ? 5000 : 2000;
    $('#level').html('Level ' + this.level);
    $('#intro').fadeIn();

    $(this).oneTime(time, function() {
      $('#intro').fadeOut(1000, callback);
    });
  },

  // Create a random tetrad.
  insertNewTetrad: function() {
    var randomIndex = Math.floor(Math.random() * 7); 
    var name        = this.tetradNames[randomIndex];
    var tetrad = new Hanami.Tetrad(name, {
                     initial:     this.definitions[name].initial,
                     transforms:  this.definitions[name].transforms, 
                     field:       this.field,
                     level:       this.level,
                     callback:    this.next.bind(this)});
  }

};

// Binding helper.
Function.prototype.bind = function() {
   var __method = this, object = arguments[0], args = [];

   for(i = 1; i < arguments.length; i++) {
       args.push(arguments[i]);
   }

   return function() {
       return __method.apply(object, args);
   };
};

// A database of tetrads, specifying initial positions and transforms.
Hanami.TetradDefinitions = {
  o: {initial: [3, 1], 
      transforms: [[[1, 1], [2, 1], [1, 2], [2, 2]]]},

  i: {initial: [3, 1], 
      transforms: [[[1, 1], [2, 1], [3, 1], [4, 1]],
                   [[1, 1], [1, 2], [1, 3], [1, 4]]]},


  s: {initial: [3, 1], 
      transforms: [[[1, 2], [2, 2], [2, 1], [3, 1]],
                   [[1, 1], [1, 2], [2, 2], [2, 3]]]},

  z: {initial: [3, 1], 
      transforms: [[[1, 1], [2, 1], [2, 2], [3, 2]],
                   [[2, 1], [2, 2], [1, 2], [1, 3]]]},

  l: {initial: [3, 1], 
      transforms: [[[1, 1], [1, 2], [2, 1], [3, 1]],
                   [[1, 1], [2, 1], [2, 2], [2, 3]],
                   [[1, 2], [2, 2], [3, 2], [3, 1]],
                   [[1, 1], [1, 2], [1, 3], [2, 3]]]},

  j: {initial: [3, 1], 
      transforms: [[[1, 1], [2, 1], [3, 1], [3, 2]],
                   [[1, 3], [2, 1], [2, 2], [2, 3]],
                   [[1, 1], [1, 2], [2, 2], [3, 2]],
                   [[1, 1], [1, 2], [2, 1], [1, 3]]]},

  t: {initial: [3, 1], 
      transforms: [[[1, 1], [2, 1], [3, 1], [2, 2]],
                   [[2, 2], [3, 1], [3, 2], [3, 3]],
                   [[2, 2], [1, 3], [2, 3], [3, 3]],
                   [[1, 1], [1, 2], [1, 3], [2, 2]]]}
};

// Start the game!
$(document).ready(function() {
  var hanami = new Hanami.Game({definitions: Hanami.TetradDefinitions, 
    blockDiameter: 24, gameFieldId: '#gameField'});
  $(document).focus();
});
