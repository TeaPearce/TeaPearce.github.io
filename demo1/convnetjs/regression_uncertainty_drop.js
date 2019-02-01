
var N, data, labels;
var density= 5.0;
var ss = 250.0; // scale for drawing
var ssw = 250.0;
var ssh = 50.0;
var acc = 0;
var alpha = 3; // for making data gen eqn, originally 4, 13
var beta = 6;
var N = 6;

var layer_defs, net, trainer, sum_y, sum_y_sq;

// create neural net
var act_in = 'tanh'
layer_defs = [];
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:1});
layer_defs.push({type:'dropout', drop_prob:0.05});
layer_defs.push({type:'fc', num_neurons:50, activation:act_in});
layer_defs.push({type:'dropout', drop_prob:0.05});
layer_defs.push({type:'fc', num_neurons:50, activation:act_in});
layer_defs.push({type:'regression', num_neurons:1});

var lix=2; // layer id of layer we'd like to draw outputs of
function reload_reg() {

  // get which activation fn checked
  var act_in = ''
  var radios = document.getElementsByName('act_fn_drop');
  for (var i = 0, length = radios.length; i < length; i++) {
      if (radios[i].checked) {
          act_in = radios[i].value;
          break;
      }
  }

  layer_defs[2].activation = act_in
  layer_defs[4].activation = act_in
  console.log('updated layer act fn: ' + layer_defs[1].activation)


  net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  trainer = new convnetjs.SGDTrainer(net, {method:'adagrad', learning_rate:0.1, momentum:0.0, batch_size:10, l2_decay:0.00001});

  sum_y = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y.push(new cnnutil.Window(50, 0));
  sum_y_sq = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y_sq.push(new cnnutil.Window(50, 0));
  acc = 0;
}

function regen_data() {
  // N = 20;
  sum_y = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y.push(new cnnutil.Window(50, 0));
  sum_y_sq = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y_sq.push(new cnnutil.Window(50, 0));
  acc = 0;
  data = [];
  labels = [];
  for(var i=0;i<N;i++) {
    // var x = Math.random()*10-5;
    // var y = x*Math.sin(x);
    // data.push([x]);
    // labels.push([y]);

    var x = Math.random()*1.; // Math.random() gives 0-1
    x -= 0.2
    if (x > 0.4) {x += 0.6;}
    // var w = randn(0, 0.03*0.03);
    // var w = randn(0, noise_var_in);
    var w = randn(0, 0.001);
    var y = x + Math.sin(alpha*(x + w)) + Math.sin(beta*(x + w)) + w; 
    // y /= 5
    data.push([x]);
    labels.push([y]);
  }
}

function regen_data_bad() {

  sum_y = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y.push(new cnnutil.Window(50, 0));
  sum_y_sq = Array();
  for(var x=0.0; x<=WIDTH; x+= density)
    sum_y_sq.push(new cnnutil.Window(50, 0));

  // create actual data
  data = [];
  labels = [];
  for(var i=0;i<N;i++) {
    var x = Math.random()*1.; // Math.random() gives 0-1
    x -= 0.2
    if (x > 0.4) {x += 0.6;}
    // var w = randn(0, 0.03*0.03);
    // var w = randn(0, noise_var_in);
    var w = randn(0, 0.001);
    var y = x + Math.sin(alpha*(x + w)) + Math.sin(beta*(x + w)) + w; 
    data.push([x]);
    labels.push([y]);
  }
}

function myinit(){
  regen_data();
  reload_reg();
}
 
function update_reg(){
  // forward prop the data
  
  var netx = new convnetjs.Vol(1,1,1);
  avloss = 0.0;

  for(var iters=0;iters<200;iters++) {
    for(var ix=0;ix<N;ix++) {
      netx.w = data[ix];
      var stats = trainer.train(netx, labels[ix]);
      avloss += stats.loss;
    }
  }
  avloss /= N*iters;

}

function draw_reg(){    
    ctx_reg.clearRect(0,0,WIDTH,HEIGHT);
    ctx_reg.fillStyle = 'rgb(220,220,220)';
    ctx_reg.fillRect(0,0,WIDTH,HEIGHT)

    var netx = new convnetjs.Vol(1,1,1);

    // draw decisions in the grid
    var draw_neuron_outputs = $("#layer_outs").is(':checked');
    
    // draw final decision
    var neurons = [];
    ctx_reg.globalAlpha = 0.5;
    ctx_reg.beginPath();
    var c = 0;
    for(var x=0.0; x<=WIDTH; x+= density) {

      netx.w[0] = (x-WIDTH/2)/ssw;
      var a = net.forward(netx);
      var y = a.w[0];
      sum_y[c].add(y);
      sum_y_sq[c].add(y*y);

      // if(draw_neuron_outputs) {
      //   neurons.push(net.layers[lix].out_act.w); // back these up
      // }ß

      if(x===0) ctx_reg.moveTo(x, -y*ssh+HEIGHT/2);
      else ctx_reg.lineTo(x, -y*ssh+HEIGHT/2);
      c += 1;
    }
    acc += 1;
    // ctx_reg.stroke();
    ctx_reg.globalAlpha = 1.;

    // draw individual neurons on first layer
    // if(draw_neuron_outputs) {
    //   var NL = neurons.length;
    //   ctx_reg.strokeStyle = 'rgb(250,50,50)';
    //   for(var k=0;k<NL;k++) {
    //     ctx_reg.beginPath();
    //     var n = 0;
    //     for(var x=0.0; x<=WIDTH; x+= density) {
    //       if(x===0) ctx_reg.moveTo(x, -neurons[n][k]*ss+HEIGHT/2);
    //       else ctx_reg.lineTo(x, -neurons[n][k]*ss+HEIGHT/2);
    //       n++;
    //     }
    //     ctx_reg.stroke();
    //   }
    // }
  
    // draw axes
    ctx_reg.beginPath();
    ctx_reg.strokeStyle = 'rgb(20,20,20)';
    ctx_reg.lineWidth = 1;
    ctx_reg.globalAlpha = 0.3;
    ctx_reg.moveTo(0, HEIGHT/2);
    ctx_reg.lineTo(WIDTH, HEIGHT/2);
    ctx_reg.moveTo(WIDTH/2, 0);
    ctx_reg.lineTo(WIDTH/2, HEIGHT);
    ctx_reg.stroke();

    // draw datapoints. Draw support vectors larger
    // ctx_reg.strokeStyle = 'rgb(0,0,0)';
    // ctx_reg.lineWidth = 1;
    // for(var i=0;i<N;i++) {
    //   drawCircle(data[i]*ss+WIDTH/2, -labels[i]*ss+HEIGHT/2, 5.0);
    // } 


    // Draw the mean plus minus 2 standard deviations
    ctx_reg.beginPath();
    ctx_reg.strokeStyle = 'rgb(0,0,250)';
    var c = 0;
    for(var x=0.0; x<=WIDTH; x+= density) {
      var mean = sum_y[c].get_average();
      if(x===0) ctx_reg.moveTo(x, -mean*ssh+HEIGHT/2);
      else ctx_reg.lineTo(x, -mean*ssh+HEIGHT/2);
      c += 1;
    }
    ctx_reg.stroke();


    // Draw the uncertainty
    ctx_reg.fillStyle = 'rgb(0,0,250)';
    ctx_reg.globalAlpha = 0.1;
    l2 = 0.005;
    tau_inv = (2 * N * 0.00001) / (1 - 0.05) / l2;
    for(var i = 1; i <= 3; i++) {
      ctx_reg.fillStyle = 'rgb(200,0,250)';
      ctx_reg.globalAlpha = 0.15; // control how many std devs, alpha of each
      ctx_reg.beginPath();
      var c = 0;
      var start = 0
      for(var x=0.0; x<=WIDTH; x+= density) {
        var mean = sum_y[c].get_average();
        var std = Math.sqrt(sum_y_sq[c].get_average() - mean * mean) + tau_inv;
        mean += 2*std * i;
        if(x===0) {start = -mean*ssh+HEIGHT/2; ctx_reg.moveTo(x, start); }
        else ctx_reg.lineTo(x, -mean*ssh+HEIGHT/2);
        c += 1;
      }
      var c = sum_y.length - 1;
      for(var x=WIDTH; x>=0.0; x-= density) {
        var mean = sum_y[c].get_average();
        var std = Math.sqrt(sum_y_sq[c].get_average() - mean * mean) + tau_inv;
        mean -= 2*std * i;
        ctx_reg.lineTo(x, -mean*ssh+HEIGHT/2);
        c -= 1;
      }
      ctx_reg.lineTo(0, start);
      ctx_reg.fill();
    }
    ctx_reg.strokeStyle = 'rgb(0,0,0)';
    ctx_reg.globalAlpha = 1.;

    // data points
    ctx_reg.strokeStyle = 'rgb(0,0,0)';
    ctx_reg.fillStyle = 'rgb(255,255,255)'; // white
    ctx_reg.globalAlpha = 1.;
    ctx_reg.lineWidth = 3;
    for(var i=0;i<N;i++) {
      ctx_reg.beginPath();
      ctx_reg.arc(data[i]*ssw+WIDTH/2, -labels[i]*ssh+HEIGHT/2, 5.0, 0, Math.PI*2, true); 
      ctx_reg.closePath();
      ctx_reg.stroke();
      ctx_reg.fill();
    }  

    // ctx_reg.fillStyle = "blue";
    // ctx_reg.font = "bold 16px Arial";
    // ctx_reg.fillText("average loss: " + avloss, 20, 20);
}

// function addPoint(x, y){
//   // add datapoint at location of click
//   alert($(NPGcanvas).width())
//   data.push([(x-$(NPGcanvas).width()/2)/ss]);
//   labels.push([-(y-$(NPGcanvas).height()/2)/ss]);
//   N += 1;
// }

function mouseClick(x, y, shiftPressed){  
  // add datapoint at location of click
  // alert(WIDTH);
  // alert($(NPGcanvas).width());
  // alert(ss);
  //alert(x);
  x = x / $(NPGcanvas_drop).width() * WIDTH;
  y = y / $(NPGcanvas_drop).height() * HEIGHT;
  data.push([(x-WIDTH/2)/ssw]);
  labels.push([-(y-HEIGHT/2)/ssh]);
  N += 1;
}