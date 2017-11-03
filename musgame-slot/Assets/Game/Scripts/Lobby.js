public var menuSkin : GUISkin;

//Our user data that we are going to put in our scene
public var userDataPrefab : GameObject;

//Information about all of our levels that we have created
public var slotData : LevelInfo[];

//The size of our buttons
public var buttonSize : Vector2;

//The picture that will be displayed if a level is locked
public var lockTexture : Texture;

//The size of our lock picture
public var lockSize : Vector2;

//Where on the button will our lock picture be placed
public var lockOffset : Vector2;

//User Data that is instanted in the scene
 var userData : GameObject;

//Private variables are not meant to be changed manually and are updated upon conditions
private var menuNumber : int;
private var pageOffset : float;
private var pageNumber : float;

//////////This information is called before anything else in the scene//////////
function Start()
{
	userData = GameObject.FindWithTag("Player");
	//If we do not have a user data object already in the scene
	if(userData == null)
	{
		//Put our user data into the scene
		userData = Instantiate(userDataPrefab, transform.position, transform.rotation);
	}
}


//////////This function is called to display our HUD (Heads Up Display) / GUI (Graphical User Interface)//////////
function OnGUI()
{
	GUI.skin = menuSkin;
	
	//If we have any level information
	if(slotData.Length > 0)
	{
		//Store how long our levels bar is going to be
		var barWidth : float = 5 * buttonSize.x + 30;
		
		//Start a group that will hold all of our levels
		GUI.BeginGroup(Rect(Screen.width/2 - barWidth/2, 90, barWidth, buttonSize.y + 10), "", "Box");
		
		//Access all the level information
		for(var i = 0; i < slotData.Length; i++)
		{
			//Stores where the level button will be placed
			var rectVector : Vector2 = Vector2(buttonSize.x * i + 5 + i * 5, 5);
			
			//Stores which page the level will be on
			var rectOffset : float = barWidth * pageNumber - pageNumber * 5;
			
			//And creates how many pages we need to display all the levels
			var thisRect : Rect = Rect(rectVector.x - rectOffset, rectVector.y, buttonSize.x, buttonSize.y);
			
			//If we have placed a picture in the icon slot
			if(slotData[i].Icon)
			{
				//If we click on a level button and the level has been unlocked
				if(GUI.Button(thisRect, slotData[i].Icon) && slotData[i].levelToUnlock <= PlayerPrefs.GetInt("Level"))
				{
					//If the picture is not our coming soon logo
					if(slotData[i].Icon.name != "ComingSoon Logo")
					{
						//Load the level
						SceneManager.LoadScene(slotData[i].sceneName);
					}
				}
				
				//If our level is lower than the level to unlock this level
				if(slotData[i].levelToUnlock > PlayerPrefs.GetInt("Level"))
				{
					//And if the picture name is not our coming soon logo
					if(slotData[i].Icon.name != "ComingSoon Logo")
					{
						//Draw our lock picture
						GUI.Label(Rect(rectVector.x - rectOffset + lockOffset.x, rectVector.y + lockOffset.y, lockSize.x, lockSize.y), lockTexture);
						
						//If our cursor is on top of this button
						if(thisRect.Contains(Event.current.mousePosition))
						{
							//And display what level you must be to unlock this level
							GUI.Label(Rect(rectVector.x - rectOffset, rectVector.y, buttonSize.x, buttonSize.y/2), "Level " + slotData[i].levelToUnlock.ToString());
						}
					}
				}
			}
		}
		//And close this group
		GUI.EndGroup();
	}
	
	
	//Draw a button to go back a page
	if(GUI.Button(Rect(75, 90, 40, buttonSize.y + 10), "<"))
	{
		//If we are not on the first page
		if(pageNumber > 0)
		{
			//Go back a page
			pageNumber -= 1;
		}
	}
	
	//Draw a button to go forward a page
	if(GUI.Button(Rect(Screen.width - 115, 90, 40, buttonSize.y + 10), ">"))
	{
		//If we are not on the last page
		if(pageNumber < 4)
		{
			//Go forward a page
			pageNumber += 1;
		}
	}
}

//This lets us see our GUI without having to press play
@script ExecuteInEditMode()