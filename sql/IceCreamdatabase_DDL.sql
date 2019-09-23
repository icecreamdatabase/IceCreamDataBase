create schema IceCreamDataBase collate utf8mb4_general_ci;

create table bots
(
	ID int unsigned auto_increment
		primary key,
	username varchar(45) not null,
	password varchar(45) not null,
	krakenClientId varchar(45) null,
	enabled bit default b'0' not null
);

create table channels
(
	ID int unsigned auto_increment
		primary key,
	channelName varchar(45) charset utf8 not null,
	enabled bit default b'0' not null,
	maxMessageLength int default 450 not null,
	minCooldown int default 0 not null
);

create table connections
(
	botID int unsigned not null,
	channelID int unsigned not null,
	shouldModerate bit default b'0' not null,
	useLocalCommands bit default b'0' not null,
	useGlobalCommands bit default b'0' not null,
	useHardcodedCommands bit default b'0' not null,
	shouldAnnounceSubs bit default b'0' not null,
	primary key (botID, channelID)
);

create index connections_channels_ID_fk
	on connections (channelID);

create table globalCommands
(
	ID int(11) unsigned auto_increment
		primary key,
	enabled bit default b'1' not null,
	isRegex bit default b'0' not null,
	command varchar(255) not null,
	response mediumtext not null,
	userLevel int(11) unsigned default 0 not null,
	cooldown int(11) unsigned default 5 not null,
	timesUsed int(11) unsigned default 0 not null
);

create table localCommands
(
	ID int(11) unsigned auto_increment
		primary key,
	channelID int unsigned not null,
	botID int unsigned null,
	enabled bit default b'1' not null,
	isRegex bit default b'0' not null,
	command varchar(255) not null,
	response mediumtext not null,
	userLevel int(11) unsigned default 0 not null,
	cooldown int(11) unsigned default 10 not null,
	timesUsed int(11) unsigned default 0 not null
);

create table notifications
(
	botID int unsigned not null,
	channelID int unsigned not null,
	SUB text null,
	SUB_T2 text null,
	SUB_T3 text null,
	SUB_PRIME text null,
	RESUB text null,
	RESUB_T2 text null,
	RESUB_T3 text null,
	RESUB_PRIME text null,
	SUBGIFT text null,
	ANONSUBGIFT text null,
	SUBMYSTERGIFT text null,
	GIFTPAIDUPGRADE text null,
	ANONGIFTPAIDUPGRADE text null,
	REWARDGIFT text null,
	RAID text null,
	RITUAL text null,
	PRIMEPAIDUPGRADE text null,
	primary key (botID, channelID)
);


