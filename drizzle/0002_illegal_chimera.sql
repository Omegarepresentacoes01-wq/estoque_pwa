CREATE TABLE `veiculo_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`veiculoId` int NOT NULL,
	`tipo` varchar(64) NOT NULL,
	`campo` varchar(64),
	`valorAnterior` text,
	`valorNovo` text,
	`usuarioNome` varchar(256),
	`usuarioId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `veiculo_historico_id` PRIMARY KEY(`id`)
);
