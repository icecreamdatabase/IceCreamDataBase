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

create table commandGroup
(
    ID int(11) unsigned auto_increment
        primary key,
    enabled bit default b'1' not null,
    name varchar(255) null
);

create table commands
(
    ID int(11) unsigned auto_increment
        primary key,
    commandGroupID int(11) unsigned null,
    enabled bit default b'1' not null,
    isRegex bit default b'0' not null,
    command varchar(255) not null,
    response mediumtext not null,
    userLevel int(11) unsigned default 0 not null,
    cooldown int(11) unsigned default 5 not null,
    timesUsed int(11) unsigned default 0 not null,
    constraint commands_commandGroup_id_fk
        foreign key (commandGroupID) references commandGroup (ID)
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
    primary key (botID, channelID),
    constraint connections_bots_ID_fk
        foreign key (botID) references bots (ID),
    constraint connections_channels_ID_fk
        foreign key (channelID) references channels (ID)
);

create table commandGroupLink
(
    id int(11) unsigned auto_increment
        primary key,
    commandGroupID int(11) unsigned not null,
    botID int(11) unsigned null,
    channelID int(11) unsigned not null,
    enabled bit default b'1' not null,
    constraint commandGroupLink_commandGroup_ID_fk
        foreign key (commandGroupID) references commandGroup (ID),
    constraint commandGroupLink_connections_botID_channelID_fk
        foreign key (botID, channelID) references connections (botID, channelID)
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

