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

create table channelPointsSettings
(
    botID int unsigned not null,
    channelID int unsigned not null,
    enabled bit default b'0' not null,
    ttsBrianCustomRewardId varchar(45) null,
    ttsJustinCustomRewardId varchar(45) null,
    ttsCooldown int(11) unsigned default 15 null,
    primary key (botID, channelID)
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

create table pointsSettings
(
    channelID int(11) unsigned not null
        primary key,
    enabled bit default b'1' not null,
    requireLive bit default b'1' not null,
    intervalPoints int(11) unsigned null,
    intervalTime int(11) unsigned not null,
    activityMaxPoints int(11) unsigned not null,
    activityReqMsgPerInterval int(11) unsigned not null,
    usernoticeSubPoints int(11) unsigned not null,
    usernoticeGiftPoints int(11) unsigned not null,
    usernoticeElsePoints int(11) unsigned null,
    rouletteWinPercent int(11) unsigned default 45 null,
    pointChangeReqUserLevel int(11) unsigned default 3 not null,
    commandTimeout int(11) unsigned default 10 not null,
    commandPointsEnabled bit default b'1' not null,
    commandPointsCommand varchar(255) default '!points' not null,
    commandPointsResponseUser varchar(255) default '' not null,
    commandPointsResponseTarget varchar(255) default '' not null,
    commandPointsTargetNr int(11) unsigned default 1 not null,
    commandTopCommand varchar(255) default '!top' not null,
    commandTopResponse varchar(255) default '' not null,
    commandTopEnabled bit default b'1' not null,
    commandShootEnabled bit default b'0' not null,
    commandShootCommandRegex varchar(255) default '^!shoot' not null,
    commandShootTargetNr int(11) unsigned default 1 not null,
    commandShootLength int(11) unsigned default 1 not null,
    commandShootExplanation varchar(255) default '' not null,
    commandShootRejectPoints varchar(255) default '' not null,
    commandShootRejectCooldown varchar(255) default '' not null,
    commandShootCooldown int(11) unsigned default 60 not null,
    commandShootCost int(11) unsigned default 1000 not null,
    commandTtsEnabled bit default b'1' not null,
    commandTtsCommandBrian varchar(255) default '' not null,
    commandTtsCommandJustin varchar(255) default '' not null,
    commandTtsResponseAccept varchar(255) default '' not null,
    commandTtsResponseRejectPoints varchar(255) default '' not null,
    commandTtsResponseRejectCooldown varchar(225) default '' not null,
    commandTtsCooldown int(11) unsigned default 60 not null,
    commandTtsCost int(11) unsigned default 1000 not null,
    commandTtsReqUserLevel int(11) unsigned default 2 not null,
    constraint pointsSettings_channels_ID_fk
        foreign key (channelID) references channels (ID)
);

create table pointsWallet
(
    userID int(11) unsigned not null,
    channelID int(11) unsigned not null,
    balance int default 0 not null,
    primary key (userID, channelID),
    constraint pointsWallet_channels_ID_fk
        foreign key (channelID) references channels (ID)
);
