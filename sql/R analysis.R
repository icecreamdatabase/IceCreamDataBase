install.packages("lubridate")
install.packages("dplyr")
library("lubridate")
library("dplyr")

rawData = read.csv(file.choose())
data = rawData
summary(data)
data$roomId = as.factor(data$roomId)
data$userId = as.factor(data$userId)
data$voice = as.factor(data$voice)
data$userLevel = as.factor(data$userLevel)
#data$TIMESTAMP = ymd_hms(data$TIMESTAMP, tz="")
data$TIMESTAMP = hour(data$TIMESTAMP)
#data$TIMESTAMP = as.Date(data$TIMESTAMP, "%Y-%m-%d")

data = subset(data, select = -c(id, messageId))
summary(data)
data = subset(data, select = -c(wasSent, userLevel, rawMessage))


tbl = table(data$voice)
subset = droplevels(data[data$voice %in% names(tbl)[tbl >= 6400],,drop=FALSE])
subset$TIMESTAMP = ((subset$TIMESTAMP + 12) %% 24) - 12
plot(subset$voice, subset$TIMESTAMP, xlab="voices", ylab="hour of the day (GMT+2)", yaxt= "n", ylim=c(-12.1,12.1), main="Voices by hour of the day")
axis(2, at=c(-12, -9, -6, -3, 0, 3, 6, 9, 12), labels=c(12, 15, 18, 21, 0, 3, 6, 9, 12))


sample = sample_n(subset, 1000)
plot(sample)
