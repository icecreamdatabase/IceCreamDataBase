create schema IceCreamDataBase collate utf8mb4_general_ci;

create table auth
(
    ID               int              not null
        primary key,
    userName         varchar(25)      null,
    enabled          bit default b'1' not null,
    enableBot        bit default b'1' not null,
    enableWhisperLog bit default b'0' not null,
    clientID         varchar(255)     not null,
    clientSecret     varchar(255)     not null,
    access_token     varchar(255)     null,
    refresh_token    varchar(255)     null,
    id_token         longtext         null,
    supinicApiUser   int              null,
    supinicApiKey    varchar(128)     null
);

create table bots
(
    ID             int unsigned auto_increment
        primary key,
    username       varchar(45)      not null,
    password       varchar(45)      not null,
    krakenClientId varchar(45)      null,
    enabled        bit default b'0' not null,
    supinicApiUser int(11) unsigned null,
    supinicApiKey  varchar(128)     null
);

create table channels
(
    ID               int unsigned auto_increment
        primary key,
    channelName      varchar(45) charset utf8 not null,
    enabled          bit default b'0'         not null,
    maxMessageLength int default 450          not null,
    minCooldown      int default 0            not null
);

create table commandGroup
(
    ID      int(11) unsigned auto_increment
        primary key,
    enabled bit default b'1' not null,
    name    varchar(255)     null
);

create table commands
(
    ID             int(11) unsigned auto_increment
        primary key,
    commandGroupID int(11) unsigned              null,
    enabled        bit              default b'1' not null,
    isRegex        bit              default b'0' not null,
    command        varchar(255)                  not null,
    response       mediumtext                    not null,
    userLevel      int(11) unsigned default 0    not null,
    cooldown       int(11) unsigned default 5    not null,
    timesUsed      int(11) unsigned default 0    not null,
    constraint commands_commandGroup_id_fk
        foreign key (commandGroupID) references commandGroup (ID)
);

create table connections
(
    botID                int unsigned     not null,
    channelID            int unsigned     not null,
    logMessages          bit default b'0' not null,
    shouldModerate       bit default b'0' not null,
    useCommands          bit default b'0' not null,
    useHardcodedCommands bit default b'0' not null,
    shouldAnnounceSubs   bit default b'0' not null,
    useChannelPoints     bit default b'0' not null,
    ttsRegisterEnabled   bit default b'0' not null,
    primary key (botID, channelID),
    constraint connections_bots_ID_fk
        foreign key (botID) references bots (ID),
    constraint connections_channels_ID_fk
        foreign key (channelID) references channels (ID)
);

create table channelPointsSettings
(
    botID                     int unsigned                                                                                                not null,
    channelID                 int unsigned                                                                                                not null,
    enabled                   bit                          default b'1'                                                                   not null,
    ttsJson                   longtext collate utf8mb4_bin default '{}'                                                                   not null,
    commandJson               longtext collate utf8mb4_bin default '{}'                                                                   not null,
    allowCommandNewLines      bit                          default b'0'                                                                   not null,
    listenOnPubSub            bit                          default b'0'                                                                   not null,
    ttsCustomRewardId         varchar(45)                                                                                                 null,
    ttsAcceptMessage          varchar(512)                                                                                                null,
    ttsRejectUserLevelMessage varchar(512)                 default 'Your TTS message has not been sent. You are not a subscriber.'        null,
    ttsRejectCooldownMessage  varchar(512)                 default 'Your TTS message has not been sent. The cooldown is not over.'        null,
    ttsRejectTimeoutMessage   varchar(512)                 default 'Your TTS message has not been sent. Your message has been timed out.' null,
    primary key (botID, channelID),
    constraint channelPointsSettings_connections_botID_channelID_fk
        foreign key (botID, channelID) references connections (botID, channelID),
    constraint commandJson
        check (json_valid(`commandJson`)),
    constraint ttsJson
        check (json_valid(`ttsJson`))
);

create table commandGroupLink
(
    id             int(11) unsigned auto_increment
        primary key,
    commandGroupID int(11) unsigned not null,
    botID          int(11) unsigned null,
    channelID      int(11) unsigned not null,
    enabled        bit default b'1' not null,
    constraint commandGroupLink_commandGroup_ID_fk
        foreign key (commandGroupID) references commandGroup (ID),
    constraint commandGroupLink_connections_botID_channelID_fk
        foreign key (botID, channelID) references connections (botID, channelID)
);

create table counters
(
    counterID varchar(65)                not null
        primary key,
    count     int(11) unsigned default 0 not null
);

create table notifications
(
    botID               int unsigned not null,
    channelID           int unsigned not null,
    SUB                 text         null,
    SUB_T2              text         null,
    SUB_T3              text         null,
    SUB_PRIME           text         null,
    RESUB               text         null,
    RESUB_T2            text         null,
    RESUB_T3            text         null,
    RESUB_PRIME         text         null,
    SUBGIFT             text         null,
    ANONSUBGIFT         text         null,
    SUBMYSTERGIFT       text         null,
    GIFTPAIDUPGRADE     text         null,
    ANONGIFTPAIDUPGRADE text         null,
    REWARDGIFT          text         null,
    RAID                text         null,
    RITUAL              text         null,
    PRIMEPAIDUPGRADE    text         null,
    primary key (botID, channelID),
    constraint notifications_connections_botID_channelID_fk
        foreign key (botID, channelID) references connections (botID, channelID)
);

create table ttsLog
(
    id         int auto_increment
        primary key,
    roomId     int                                   not null,
    userId     int                                   not null,
    rawMessage varchar(512)                          not null,
    voice      varchar(45)                           null,
    wasSent    bit       default b'1'                not null,
    userLevel  tinyint                               null,
    TIMESTAMP  timestamp default current_timestamp() not null,
    messageId  varchar(36)                           not null
);

create index ttsLog_roomId_index
    on ttsLog (roomId);

create index ttsLog_userId_index
    on ttsLog (userId);

create index ttsLog_voice_index
    on ttsLog (voice);

create index ttsLog_wasSent_index
    on ttsLog (wasSent);

create table userBlacklist
(
    userId  int(10)                              not null
        primary key,
    addDate datetime default current_timestamp() not null
);

