# CI/CD integration using FCLI

FCLI is Fortify's CLI utility for interacting with Fortify servers like SSC and FOD.



# [<img src="https://ams.fortify.com/Images/company-logos/Fortify-F-OT_blue_square.png" width="200"> https://github.com/fortify/fcli](https://github.com/fortify/fcli)

or, if you are old-school like me...


```
8 8888888888       ,o888888o.    8 8888          8 8888
8 8888            8888     `88.  8 8888          8 8888
8 8888         ,8 8888       `8. 8 8888          8 8888
8 8888         88 8888           8 8888          8 8888
8 888888888888 88 8888           8 8888          8 8888
8 8888         88 8888           8 8888          8 8888
8 8888         88 8888           8 8888          8 8888
8 8888         `8 8888       .8' 8 8888          8 8888
8 8888            8888     ,88'  8 8888          8 8888
8 8888             `8888888P'    8 888888888888  8 8888

             ________         _   _  __       
            / /  ____|       | | (_)/ _|      
 __      __/ /| |__ ___  _ __| |_ _| |_ _   _ 
 \ \ /\ / / / |  __/ _ \| '__| __| |  _| | | |
  \ V  V / /  | | | (_) | |  | |_| | | | |_| |
   \_/\_/_/   |_|  \___/|_|   \__|_|_|  \__, |
                                         __/ |
                                        |___/ 
___.               _________  .__            .__             _____.___.                          ____   
\_ |__  ___.__.    \_   ___ \ |  |__ _______ |__|  ______    \__  |   |  ____   __ __   ____    / ___\  
 | __ \<   |  |    /    \  \/ |  |  \\_  __ \|  | /  ___/     /   |   | /  _ \ |  |  \ /    \  / /_/  > 
 | \_\ \\___  |    \     \____|   Y  \|  | \/|  | \___ \      \____   |(  <_> )|  |  /|   |  \ \___  /  
 |___  // ____|     \______  /|___|  /|__|   |__|/____  >     / ______| \____/ |____/ |___|  //_____/   
     \/ \/                 \/      \/                 \/      \/                           \/           
                                                                                                        
```


----------
## Getting started / Installing

FCLI is implemented as a [JAR](https://github.com/fortify/fcli/releases/download/v3.5.2/fcli.jar) file.  You can either download the package and call using java syntax or you can install locally.  Latest release is here: [https://github.com/fortify/fcli/releases/tag/v3.5.2](https://github.com/fortify/fcli/releases/tag/v3.5.2)

```console

java -jar fcli.jar <your commands go here>

```


I'm using a Mac, and FCLI happens to come with a self installer.  I can download an older fcli.jar file and have it self-install.  Then I can edit my Zsh config files to add the newly installed path to my shell.

```sh
# Command to install latest version
java -jar fcli.jar tool fcli install -v latest


# I'll recieve something like this:
Running post-install actionsINFO: Add the following directory to PATH for easy tool invocation:
  /Users/chrisyoung/fortify/tools/bin

INFO: Add the following directory to PATH for easy tool invocation:
  /Users/chrisyoung/fortify/tools/bin

 Name  Version  Aliases         Stable  Install dir                                 Action    
 fcli  3.5.1    3.5, 3, latest  Yes     /Users/chrisyoung/fortify/tools/fcli/3.5.1  INSTALLED 


# Then I can add my path by eiting ~/.zshrc
nano ~/.zshrc
```


Now that I have my fcli utility installed (or at least have the JAR file saved locally somewhere), I can logon to FOD:

```sh
# The installed and pathed fcli way
fcli fod session login --url=https://ams.fortify.com -u '<username>' -t '<tenant>' -p '<password>'

# The corresponding java syntax
java -jar fcli.jar fod session login --url=https://ams.fortify.com -u '<username>' -t '<tenant>' -p '<password>'

# results in the following:

 Name     Type  Url                          Created                  Expires                  Expired  Action  
 default  FoD   https://api.ams.fortify.com  2025-06-11 01:59:34 UTC  2025-06-11 07:59:29 UTC  No       CREATED 
```

To invoke a new scan, I can do:

```sh
# fcli way
scan=$(fcli fod sast-scan start --release=1483846 --file /Applications/fcli-mac/sample-eightball-master.zip --store scan | awk '/Id/ && /Action/ { getline; if (match($0, / [0-9]+( |$)/)) print substr($0, RSTART + 1, RLENGTH - 2) }')

# java way
scan=$(java -jar fcli.jar fod sast-scan start --release=1483846 --file /Applications/fcli-mac/sample-eightball-master.zip --store scan | awk '/Id/ && /Action/ { getline; if (match($0, / [0-9]+( |$)/)) print substr($0, RSTART + 1, RLENGTH - 2) }')

# echo the scan variable
echo $scan

# results in:
14820666
```

Then I wait for the scan results to finish:

```sh
# fcli way
fcli fod sast-scan wait-for $scan

# java way
java -jar fcli.jar fod sast-scan wait-for $scan

# (after some waiting....) results in:
 Id        Analysis Status  Scan type  Action        
 14820666  Completed        Static     WAIT_COMPLETE 
```

Now you can query the status and decide whether to fail pipelines or not:

```sh
# simple print of the relevant fields:
fcli fod sast get $scan | grep -E "analysisStatusType:|starRating:|issueCountCritical:"
java -jar fcli.jar fod sast get $scan | grep -E "analysisStatusType:|starRating:|issueCountCritical:"

# results in:
analysisStatusType: Completed
issueCountCritical: 0
starRating: 3


# or store in variables using the fcli way:
read analysisStatusType starRating issueCountCritical <<< "$(fcli fod sast get $scan | awk -F: '/^analysisStatusType:/ {analysisStatusType=$2} /^starRating:/ {starRating=$2} /^issueCountCritical:/ {issueCountCritical=$2} END {print analysisStatusType starRating issueCountCritical}')"

# or the java way:
read analysisStatusType starRating issueCountCritical <<< "$(java -jar fcli.jar fod sast get $scan | awk -F: '/^analysisStatusType:/ {analysisStatusType=$2} /^starRating:/ {starRating=$2} /^issueCountCritical:/ {issueCountCritical=$2} END {print analysisStatusType starRating issueCountCritical}')"

# echo
echo $scan $analysisStatusType $starRating $issueCountCritical

# results in:
14820666 Completed 3 0

# negative results might be: 
14767167 Canceled 0 0
```