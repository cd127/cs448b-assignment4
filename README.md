#######################
# Stanford Course
# CS448B - Assignment 4
# Winter 2020
# by Cedric De Brito
#######################

This folder is organized as follows:
 - public contains
    - all the code deployed to https://cs448b-w2020-debrito.firebaseapp.com/
    - datasets which can be used as examples to test the visualization
 - doc contains the paper associated with the work

To see the visualization, please go to https://cs448b-w2020-debrito.firebaseapp.com/ on a Chrome or Firefox browser.
To run locally, simply start a local server in the "public" folder. (e.g. run "python3 -m http.server" in a linux terminal)

Suggested step through to understand the work (what would have been in the demo):
 1. Read the paper

 2. Use Chrome to navigate to https://cs448b-w2020-debrito.firebaseapp.com/
 3. Click on the "Load Data" button
 4. In the File Selection dialog, find this folder in your HD and continue to the folder public/data/colonization_data
 5. Select file "COLDAT_britain.csv"
 6. Click on the dropdown named "Event" and choose the field "location"
 7. Click on "Visualize!"
 8. Watch the animation and feel the awe of witnessing the extent of the British Empire
    8a. Pause the animation at any time (space bar) and zoom in to one event
    8b. Tap Play again and watch the automatic framing taking you back to a full view

 9. Once it reaches the end,
    9a. click the middle toggle button on the left pane to disable clearing of old points
    9b. click the Play button again
    9c. let the animation run to the end
    9d. feel free to use the Speed Up and Slow Down buttons
 10. Explore the data by clicking on any point and seeing its detailed information on the left pane

 11. Once you are done with this, press the Back button at the top left
 12. Click on the "Load Data" button
 13. Select file "COLDAT_france.csv"
 14. Click on the "Add another dataset" button in the bottom-left
 15. Select file "COLDAT_portugal.csv"
 16. For both files, click on the dropdown named "Event" and choose the field "location"
 17. For both files, copy-paste this exact text (without the ><) into the "Description" textbox:
    >"In " + obj.dateStart + ", " + obj.colonizer + " colonized " + obj.location + ".  Then, in " + obj.dateEnd + ", " + obj.location + " became independent."<
 18. Click on "Visualize!"
 19. Watch Portugal's early start followed by France's aspirations for Africa
    19a. Disable clearing of points if you wish to look into the data at the end
    19b. Feel free to pause at any time and explore the data by zooming/panning at will
    19c. Pay attention to the descriptive text displayed in the boxes on the left - it is customized!

 20. Once you are done with this, press the Back button at the top left
 21. Click on the "Load Data" button
 22. Select file "data/storm/Weather_Deaths_2017.csv"
 23. Click on "Visualize!"
 24. Watch the animation and see the alarming number of fatal accidents related to weather in the US each year
    24a. Notice the automatically-adapted date granularity
    24b. Notice the adaptive zooming depending on the data spread
    24c. To change zooming modes and take a more conservative zoom-out-only approach, click the right-most toggle button on the left pane

That's it!
You should now know enough to explore the tool further.
Another suggestion:
"Weather_Deaths_2017.csv" dataset with description (without ><): >obj.DEATHS_DIRECT + " people died from " + obj.event<

