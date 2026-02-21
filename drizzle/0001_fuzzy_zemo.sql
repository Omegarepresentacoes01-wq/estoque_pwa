CREATE TABLE `programacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedido` varchar(32),
	`idModelo` varchar(32),
	`mesPrevisto` varchar(32),
	`modelo` text,
	`cor` varchar(64),
	`local` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `veiculos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` int,
	`nf` varchar(32),
	`dataEmissao` date,
	`cod` varchar(32),
	`modelo` text,
	`anoMod` varchar(16),
	`cor` varchar(64),
	`chassi` varchar(32),
	`dataChegadaCovezi` date,
	`dataAtual` date,
	`status` enum('LIVRE','RESERVADO','VENDIDO') NOT NULL DEFAULT 'LIVRE',
	`diasEstoque` int,
	`diasPatio` int,
	`cliente` varchar(256),
	`estoquesFisico` varchar(128),
	`observacao` text,
	`implemento` varchar(128),
	`pneu` varchar(64),
	`defletor` varchar(64),
	`notificado` enum('nao','sim') NOT NULL DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `veiculos_id` PRIMARY KEY(`id`)
);
