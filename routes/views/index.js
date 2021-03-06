var keystone = require('keystone');
var Orcamento = keystone.list('Orcamento');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
 
exports = module.exports = function(req, res) {
    
	var view = new keystone.View(req, res);
	
	var locals = res.locals;

	var servicos = keystone.list('Servicos');
	
	servicos.model.find()
    .sort('order')
    .exec(function(err, servicos) {
		transformServices(servicos);
        locals.servicos = servicos;
	});

	var depoimentos = keystone.list('Depoimentos');

	depoimentos.model.find()
    .sort('order')
    .exec(function(err, depoimentos) {
        locals.depoimentos = depoimentos;
	});
	
	// var estados = keystone.list('Estados');

	// estados.model.find()
    // .sort('-publishedAt')
    // .exec(function(err, estados) {
	// 	locals.estados = estados;
	// });

	// var cidades = keystone.list('Cidades');

	// cidades.model.find()
    // .sort('-publishedAt')
    // .exec(function(err, estados) {
    //     locals.cidades = cidades;
	// });

    

	locals.section = 'send';
	locals.formData = req.body || {};
	locals.validationErrors = {};
	locals.enquirySubmitted = false;

	setTimeout(function() {
		view.render('index');
	}, 1200)

	var transformServices = function(services) {
		locals.servs = {};
		for (var i = 0; i < services.length; i++) {
			locals.servs[services[i]._id] = services[i];
		}
	};

	// var loadCities = function(estado) {
	// 	var citiesId = estado.cidades;
	// 	var cids = [];

	// 	for (var i = 0; i < citiesId.length; i++) {
	// 		cidades.model.findOne(citiesId[i])
	// 		.exec(function(err, cidade) {
	// 			cids.push(cidade);
	// 			console.log(cids);
	// 		});
	// 	}
	// };

	view.on('post', { action: 'contact' }, function (next) {

		var application = new Orcamento.model();
		var updater = application.getUpdateHandler(req);
		var d = req.body.disponibilidade;
		var p = req.body.periodo;
		
		req.body.ordemServico = Math.floor(new Date().valueOf()).toString();

		if (d && d.length > 1) {
			var dString = '';
			for (var i = 0; i < d.length; i++) {
				dString = dString + d[i] + ' ';
			}
			req.body.disponibilidade = dString;
		}

		if (p && p.length > 1) {
			var pString = '';
			for (var i = 0; i < p.length; i++) {
				pString = pString + p[i] + ' ';
			}
			req.body.periodo = pString;
		}

		req.body.servs = [];

		if (req.body.servicos.length) {
			for (var i = 0; i < req.body.servicos.length; i++) {
				req.body.servs.push(locals.servs[req.body.servicos[i]].name);
			}
		}

		locals.formData.servs = req.body.servs.join(', ');

		updater.process(req.body, {
			flashErrors: true
		}, function (err) {
			if (err) {
				locals.validationErrors = err.errors;
				console.log(err);
			} else {
				locals.enquirySubmitted = true;
				locals.ordemServico = req.body.ordemServico;
				main(req.body).catch(console.error); 
			}
			next();
		});

	});

	// async..await is not allowed in global scope, must use a wrapper
	async function main(body){

		const oauth2Client = new OAuth2(
			"430361646430-9qrgnb7jusbpi5q3hs5p8apc7809s77g.apps.googleusercontent.com", // ClientID
			"-kvISwDvyNkkPXQuZOMsprkm", // Client Secret
			"https://developers.google.com/oauthplayground" // Redirect URL
		);
	
		oauth2Client.setCredentials({
			refresh_token: "1/j8u16wCz6oJBZ_j4XHksHvMWwkeHYoTQbc73ldTAcnk1SCgLUVU7F5WAEZsmLcZx"
		});
	   	const tokens = await oauth2Client.refreshAccessToken()
		const accessToken = tokens.credentials.access_token		   
	
		const smtpTransport = nodemailer.createTransport({
			service: "gmail",
			auth: {
				type: "OAuth2",
				user: "carcarebrazil@gmail.com", 
				clientId: "430361646430-9qrgnb7jusbpi5q3hs5p8apc7809s77g.apps.googleusercontent.com",
				clientSecret: "-kvISwDvyNkkPXQuZOMsprkm",
				refreshToken: "1/j8u16wCz6oJBZ_j4XHksHvMWwkeHYoTQbc73ldTAcnk1SCgLUVU7F5WAEZsmLcZx",
				accessToken: accessToken
			},
			tls: {
				rejectUnauthorized: false
			}
		});
		
		var disp = '';
		if (body.disponibilidade && body.disponibilidade.length > 0) {
			var disp = body.disponibilidade.toString()
		}

		var per = '';
		if (body.periodo && body.periodo.length > 0) {
			per = body.periodo.toString();
		}

		// setup email data with unicode symbols
		let mailOptions = {
		from: '"All Done Car Service" <carcarebrazil@gmail.com>', // sender address
		to: "carcarebrazil@gmail.com", // list of receivers
		subject: "Solicitação de serviço nº: " + body.ordemServico + " ✔", // Subject line
		text: "Hello world?", // plain text body
		html: "<b>Cliente: </b>" + body.name + "<br>" +
			  "<b>Telefone: </b>" + body.telefone + "<br>" +
			  "<b>Atendimento via: </b>" + body.atendimento + "<br>" +
			  "<b>Marca do carro: </b>" + body.marcaCarro + "<br>" +
			  "<b>Modelo do carro: </b>" + body.modeloCarro + "<br>" +
			  "<b>Ano do carro: </b>" + body.anoCarro + "<br>" +
			  "<b>Servicos: </b>" + body.servs + "<br>" +
			  "<b>Mensagem: </b>" + body.mensagem + "<br>" +
			  "<b>Disponibilidade: </b>" + disp + "<br>" +
			  "<b>Período do dia: </b>" + per + "<br>"
		};

		// send mail with defined transport object
		smtpTransport.sendMail(mailOptions, (error, response) => {
			error ? console.log(error) : console.log(response);
			smtpTransport.close();
	   });
	} 
    
};