CREATE TABLE `colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('colaborador','admin') NOT NULL DEFAULT 'colaborador',
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`userId` int,
	`convidadoPor` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastAccessAt` timestamp,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`),
	CONSTRAINT `colaboradores_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`nome` varchar(256) NOT NULL,
	`role` enum('colaborador','admin') NOT NULL DEFAULT 'colaborador',
	`status` enum('pendente','aceito','expirado','revogado') NOT NULL DEFAULT 'pendente',
	`criadoPor` varchar(256),
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
