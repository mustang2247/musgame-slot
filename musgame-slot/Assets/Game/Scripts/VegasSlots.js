import UnityEngine.SceneManagement;

//The coin shower particle effect
public var coinShower : ParticleSystem;

//The special audio source
public var specialAudio : AudioSource;

//The object shown when we have free spins
public var scatterObject : GameObject;

//The text object that displays the free spin count
public var scatterCountObject : TextMesh;

//Paytable image that is displayed
public var payTableImage : Texture2D;

//Toggle between two different pay line directions
enum PayoutOrder{fromLeft, fromRight};
public var payoutOrder : PayoutOrder;

//Amount of symbols on the first reel (Restricted between 3 and 100)
@Range(3, 100)
public var iconsPerReel : int;

//How many more symbols each reel should have compared to the previous (Restricted between 3 and 20)
@Range(3, 20)
public var iconsPerReelDifference : int;

//The size of each symbol (Restricted between 0 and 5)
@Range(0, 5)
public var iconSize : float;

//The speed at which the reels spin (Restricted between 50 and 200)
@Range(50, 200)
public var spinSpeed : float;

//The amount of bounce of a reel when it stops (Restricted between 0 and 5)
@Range(0, 5)
public var reboundAmount : int;

//The speed of a bounce of a reel when it stops (Restricted between 0 and 50)
@Range(0, 50)
public var reboundSpeed : int;

//The amount of free spins won if 3 symbols appear on screen (Restricted between 0 and 20)
@Range(0, 20)
public var scatterSize : int;

//The highest available bet from the list of bet amounts (Restricted between 3 and 17)
@Range(3, 17)
public var maxBet : int;

//All of the betting amounts from lowest to greatest
public var betAmounts : float[] = [0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 20.0, 25.0, 50.0, 100.0, 150.0, 200.0, 250.0, 300.0, 500.0, 1000.0];

//An array of Symbol information
public var iconInfo : IconInfo[];

//An array of audio information
public var audioInfo : AudioInfo[];

//An array of Line information
public var linesInfo : LinesInfo;

//An array of button information
public var buttonInfo : ButtonInfo[];

//An array of display information
public var displayInfo : DisplayInfo[];

//An array of bonus information
public var bonusInfo : BonusInfo;

//An array of reel information (Hidden in inspector)
@HideInInspector
public var reelInfo : ReelInfo[];

//The line parent object (Hidden in inspector)
@HideInInspector
public var lines : GameObject;

//Stores bonus wins until all reels have stopped (Hidden in inspector)
@HideInInspector
public var tempBonusState : int = 0;

//Stores scatter wins until all reels have stopped (Hidden in inspector)
@HideInInspector
public var tempScatter : int = 0;

//A toggle to notify us that we are spinning (Hidden in inspector)
@HideInInspector
public var spinning : boolean;

//The variables below should not be changed and are not available in the inspector
private var userData : UserData;
private var linePositions : Vector3[] = new Vector3[15];
private var displayWinningEffects : boolean;
private var scatterSpinning : boolean;
private var generatingLine : boolean;
private var showPayTable : boolean;
private var inBonusGame : boolean;
private var iconsSet : boolean;
private var prevIconCount : int;
private var scattersLeft : int;
private var bonusWinnings : float;
private var lineCount : int;
private var prevFaceIcons : int[];
private var faceIcons : int[];
private var faceSprites : int[];
private var curSpinSpeed : float;
private var scatterTimer : float;
private var effectsTimer : float;
private var totalPayout : float;
private var targetPos : float;
private var currentBet : float = 3.0;
private var fadeValue : float = 1;
private var picks : int = 0;
private var touching : boolean;
private var csEmittion : ParticleSystem.EmissionModule;


//////////Called before any other code//////////
function Awake()
{
	//If we an object in the scene with the tag Player
	if(GameObject.FindWithTag("Player"))
	{
		//Store that object as our users information object
		userData = GameObject.FindWithTag("Player").GetComponent.<UserData>();
	}
	
	//Turn off our scatter display
	scatterObject.SetActive(false);
	
	//Turn off our bonus information display
	bonusInfo.bonusInfoParent.SetActive(false);
	
	//Turn off the coin shower effect
	csEmittion = coinShower.emission;
	csEmittion.enabled = false;
	
	//Generate entirely new reels
	GenerateNewReels();
	
	//For all the reels
	for(var a = 0; a < reelInfo.Length; a++)
	{
		//Position each reel at the starting position
		RepositionReel(a, reelInfo[a].targetPosition);
	}
	
	//Calculate line positions
	GenerateLineInfo();
	
	//Start with max lines
	lineCount = linesInfo.lineInfo.Length;
	
	//Update interface text
	UpdateText();
	
	//Notify the system that we are ready
	iconsSet = true;
	
	//Ensure we can see the reels
	fadeValue = 1;
}


//////////Called every frame//////////
function Update()
{
	//If we changed the of symbols per reel
	if(prevIconCount != iconsPerReel)
	{
		//Generate entirely new reels
		GenerateNewReels();
	}
	
	//If we are supposed to generate a new line
	if(generatingLine)
	{
		//Create a new line
		GenerateNewLine();
	}
	
	//If we left click
	if(Input.GetMouseButtonDown(0))
	{
		//If we are not in a bonus game
		if(!inBonusGame)
		{
			//Check for a button
			Click(Input.mousePosition);
		}
		
		//If we are in a bonus game and we can pick an item
		if(inBonusGame && picks > 0)
		{
			//Check for item
			ClickBonus(Input.mousePosition);
		}
	}
	
	/////Mobile code/////
	//If we touched the screen
	if(Input.touchCount > 0 && !touching)
	{
		if(Input.GetTouch(0).phase == TouchPhase.Began && !touching) 
		{
			touching = true;
			//If we are not in a bonus game
			if(!inBonusGame)
			{
				//Check for a button
				Click(Input.GetTouch(0).position);
			}
			
			//If we are in a bonus game and we can pick an item
			if(inBonusGame && picks > 0)
			{
				//Check for item
				ClickBonus(Input.GetTouch(0).position);
			}
		}
	}
	if(Input.touchCount == TouchPhase.Ended || Input.touchCount == TouchPhase.Canceled)
	{
		if(touching)
		{
			touching = false;
		}
	}
	
	//For all of our fading objects
	for(var obj : SpriteRenderer in bonusInfo.fadeObjects)
	{
		//If we are supposed to fade in or out
		if(obj.color.a != fadeValue)
		{
			//Fade in or out
			obj.color.a = Mathf.MoveTowards(obj.color.a, fadeValue, Time.deltaTime);
		}
	}
	
	//If we are in a bonus game
	if(inBonusGame)
	{
		//If our bonus game volume has not faded in
		if(bonusInfo.bonusBackground.GetComponent.<AudioSource>().volume != 1 - fadeValue)
		{
			//Fade in the bonus game volume
			bonusInfo.bonusBackground.GetComponent.<AudioSource>().volume = Mathf.MoveTowards(bonusInfo.bonusBackground.GetComponent.<AudioSource>().volume, 1 - fadeValue, Time.deltaTime);
		}
	}
	
	//If we are supposed to be spinning
	if(spinning)
	{
		//Increase our spin speed over time
		curSpinSpeed = Mathf.Lerp(curSpinSpeed, spinSpeed, Time.deltaTime);
		
		//For all the reels
		for(var i = 0; i < 5; i++)
		{
			//If this reel is supposed to spin
			if(reelInfo[i].spinning)
			{
				//Move this reel as fast as the spin speed
				reelInfo[i].reel.transform.position.y = Mathf.MoveTowards(reelInfo[i].reel.transform.position.y, reelInfo[i].targetPosition - reboundAmount, curSpinSpeed * Time.deltaTime);
			}
			
			//If our reels position is at it's final destination
			if(reelInfo[i].reel.transform.position.y == reelInfo[i].targetPosition - reboundAmount)
			{
				//If we are still spinning
				if(reelInfo[i].spinning)
				{
					//Stop this reel
					StopReel(i);
				}
			}
		}
	}
	
	//If we are supposed to be displaying our winning effects
	if(displayWinningEffects)
	{
	    //If our coins should be incrementing
	    csEmittion = coinShower.emission;
		if(userData.fluxCoins != userData.coins && csEmittion.enabled == false)
		{
			//Turn on our coin shower effect
		    csEmittion.enabled = true;
		}
		
		//If our coins are not supposed to increment
		if(userData.fluxCoins == userData.coins && csEmittion.enabled == true)
		{
			//Turn off our coin shower effect
		    csEmittion.enabled = false;
		}
		
		//Increment our effects timer
		effectsTimer += Time.deltaTime;
		
		//For all of our lines
		for(var line : LineInfo in linesInfo.lineInfo)
		{
			//If we have a line that we have won on
			if(line.winner)
			{
				//If the effects timer is less than 0.75 and we can't see our line
				if(effectsTimer < 0.75 && !line.lineParent.activeSelf)
				{
					//Turn on our line
					line.lineParent.SetActive(true);
				}
				
				//If our effects timer is greater than 0.75
				if(effectsTimer > 0.75)
				{
					//If we can see our line
					if(line.lineParent.activeSelf)
					{
						//Turn off our line
						line.lineParent.SetActive(false);
					}
					
					//If the effects timer is greater or equal to 1
					if(effectsTimer >= 1)
					{
						//Reset our effects timer and restart
						effectsTimer = 0.0;
					}
				}
			}
		}
	}
	
	//If we have free spins
	if(scattersLeft > 0)
	{
		//If our free spin text is not the same as our free spins
		if(scatterCountObject.text != scattersLeft.ToString())
		{
			//Make our free spin text the same as our free spins
			scatterCountObject.text = scattersLeft.ToString();
		}
		
		//If we are not in a bonus game and we not going to get a bonus game
		if(!inBonusGame && tempBonusState == 0)
		{
			//Continue our free spins
			EngageScatters();
		}
	}
	
	//For all of our reels
	for(var r = 0; r < reelInfo.Length; r++)
	{
		//If this reel is not spinning
		if(!reelInfo[r].spinning)
		{
			//We haven't stopped yet
			if(reelInfo[r].reel.transform.position.y < reelInfo[r].targetPosition)
			{
				//Create a bounce effect to stop at our final destination
				reelInfo[r].reel.transform.position.y = Mathf.Lerp(reelInfo[r].reel.transform.position.y, reelInfo[r].targetPosition, reboundSpeed * Time.deltaTime);
			}
		}
	}
}

//////////Check a reel for animated symbols//////////
function CheckForAnimatedIcons(r : int, s : int)
{
	var info = reelInfo[r].slotOrder[s];
	//For all the symbols
	
	//If this symbol is a winner
	if(info.canAnimate)
	{
		//If we have an animation for this symbol
		if(iconInfo[info.ID].spriteAnimation.Length > 0)
		{
			//For all the images in this symbols animation
			for(var i = 0; i < iconInfo[info.ID].spriteAnimation.Length; i++)
			{
				//If this image in the animation exists
				if(iconInfo[info.ID].spriteAnimation[i] != null)
				{
					//If we have a sprite to change
					if(info.sprite)
					{
						//Change the sprite to the next clip in the animation
						info.sprite.GetComponent.<SpriteRenderer>().sprite = iconInfo[info.ID].spriteAnimation[i];
					}
				}
				//If we are not spinning
				if(!spinning)
				{
					//Wait for the frame to end
					yield WaitForSeconds(iconInfo[info.ID].animatedFramesPerSecond);
					
					//If still not spinning
					if(!spinning)
					{
						//If we are at the last frame of the animation
						if(i == iconInfo[info.ID].spriteAnimation.Length - 1)
						{
							//Return the sprite back to its original image
							info.sprite.GetComponent.<SpriteRenderer>().sprite = iconInfo[info.ID].spriteAnimation[0];
							
							//And tell the symbol that we should no longer animate
							info.canAnimate = false;
						}
					}
				}
			}
		}
	}
}


//////////Update our text information//////////
function UpdateText()
{
	//For all of our text objects
	for(var info : DisplayInfo in displayInfo)
	{
		//Update the information for this text
		gameObject.SendMessage("Update" + info.functionType.ToString(), info.textObject);
	}
}


//////////Update our line text//////////
function UpdateLineCount(text : TextMesh)
{
	//Show our new line text
	text.text = lineCount.ToString();
}


//////////Update our bet text//////////
function UpdateBetAmount(text : TextMesh)
{
	//Show our new bet amount
	text.text = betAmounts[currentBet].ToString();
}


//////////Return to lobby function//////////
function Lobby()
{
	//Return to the lobby scene
	SceneManager.LoadScene("Lobby");
}


//////////Paytable function//////////
function PayTable()
{
	//Display the paytable
	showPayTable = true;
}


//////////Update our Total Win information//////////
function UpdateTotalWin(text : TextMesh)
{
	//If we did not win anything
	if(totalPayout == 0)
	{
		//Don't show a winning amount
		text.text = "";
	}
	
	//If we did win something
	else
	{
		//Show our winning amount
		text.text = totalPayout.ToString();
	}
}


//////////Update our total bet//////////
function UpdateTotalBet(text : TextMesh)
{
	//A stored value of lines by bet
	var totalBet = lineCount * betAmounts[currentBet];
	
	//Display our total bet
	text.text = totalBet.ToString();
}


//////////Darkening buttons to indicate inactive//////////
function DarkenButtons()
{
	//For all of our buttons
	for(var button : ButtonInfo in buttonInfo)
	{
		//If this button is not paytable, lobby or settings
		if(button.functionType != button.FunctionType.PayTable && button.functionType != button.FunctionType.Lobby && button.functionType != button.FunctionType.Settings)
		{
			//If we have a sprite for this button
			if(button.sprite != null)
			{
				//If the button is not grayed
				if(button.sprite.GetComponent.<SpriteRenderer>().material.color != Color.gray)
				{
					//Gray out this button
					button.sprite.GetComponent.<SpriteRenderer>().material.color = Color.gray;
				}
			}
		}
	}
}


//////////Lighten buttons to indicate that it's active//////////
function LightenButtons()
{
	//For all of the buttons
	for(var button : ButtonInfo in buttonInfo)
	{
		//If we have a sprite for this button
		if(button.sprite != null)
		{
			//If the button is not lightened
			if(button.sprite.GetComponent.<SpriteRenderer>().material.color != Color.white)
			{
				//Lighten this button
				button.sprite.GetComponent.<SpriteRenderer>().material.color = Color.white;
			}
		}
	}
}


//////////Left mouse click / Finger push function with a position parameter to check for buttons//////////
function Click(position : Vector3)
{
	//Ray that is drawn based on the click/touch position and our main camera
	var ray : Ray = GetComponent.<Camera>().ScreenPointToRay(position);
	
	//The hit of the ray
	var hit : RaycastHit;
	
	//If the ray hit anything within 100 units away
	if(Physics.Raycast(ray, hit, 100))
	{
		//For every button
		for(var button : ButtonInfo in buttonInfo)
		{
			//If the buttons sprite exists
			if(button.sprite != null)
			{
				//If the hit object is this sprite
				if(hit.transform == button.sprite.transform)
				{
					//If the buttons function type is spin
					if(button.functionType == button.FunctionType.Spin)
					{
						if(scattersLeft == 0)
						{
							//Call the spin function with parameters to deduct coins
							gameObject.SendMessage(button.functionType.ToString(), lineCount * betAmounts[currentBet]);
						}
					}
					
					//If the buttons function type is not spin
					else
					{
						//Invoke the buttons function immediatly
						Invoke(button.functionType.ToString(), 0.0);
					}
				}
			}
		}
	}
}

//////////Left mouse click / Finger push function with a position parameter to check for bonus objects//////////
function ClickBonus(position : Vector3)
{
	//Ray that is drawn based on the click/touch position and our bonus camera
	var ray : Ray = bonusInfo.bonusCamera.ScreenPointToRay(position);
	
	//The hit of the ray
	var hit : RaycastHit;
	
	//If the ray hits something within 100 units
	if(Physics.Raycast (ray, hit, 100))
	{
		//If the object it hit has an item tag
		if(hit.transform.tag == "Item")
		{
			//If the audio information has atleast 6 openings
			if(audioInfo.Length > 6)
			{
				//If the 6th audio slot has audio
				if(audioInfo[6].audioClip)
				{
					//Adjust the volume to what we have specified
					bonusInfo.bonusCamera.GetComponent.<AudioSource>().volume = audioInfo[6].audioVolume;
					
					//Play the audio clip one time
					bonusInfo.bonusCamera.GetComponent.<AudioSource>().PlayOneShot(audioInfo[6].audioClip);
				}
			}
			//Add the value of this object to our bonus winnings
			bonusWinnings += hit.collider.GetComponent.<BonusObjectValue>().Value;
			
			//Tell it to show how much this was worth
			hit.collider.GetComponent.<BonusObjectValue>().displayValue = true;
			
			//Turn off the sprite
			hit.collider.GetComponent.<SpriteRenderer>().enabled = false;
			
			//Turn off the collider
			hit.collider.enabled = false;
			
			//Deduct from our picks
			picks -= 1;
			
			//Adjust our picks text
			bonusInfo.bonusAmountText.text = picks.ToString();
			
			//And check how many picks we have left
			CheckPicks();
		}
	}
}


//////////Generate entirely new reels//////////
function GenerateNewReels()
{
	//Store the previous icons that were on the screen
	StorePreviousFaceIcons();
	
	//Remove the Reels
	RemovePreviousReels();
	
	//And create new Reels
	UpdateAmountOfReels();
	
	//Update the new symbols
	UpdateIconsPerReel();
	
	//And create a list of symbols that will display on the screen
	PopulateFaceIcons();
}


//////////Adjusts the bet to max and spins//////////
function MaxBet()
{
	//If we are not spinning, in a bonus game or in a free spin
	if(!spinning && !inBonusGame && !scatterSpinning)
	{
		var maxedBet = GetLargestBet();
		if(maxedBet == 1000) return;
		
		//Maximize the line count
		lineCount = linesInfo.lineInfo.Length;
		
		//Maximize the bet
		currentBet = maxedBet;
		
		//And spin with the max amount
		Spin(lineCount * betAmounts[currentBet]);
	}
}

function GetLargestBet()
{
	for(var i = betAmounts.Length - 1; i >= 0; i--)
	{
		if(userData.coins >= lineCount * betAmounts[i])
		{
			return i;
		}
	}
	return 1000;
}

//////////Spins the reels and deducts the price//////////
function Spin(Deduction : float)
{
	//If we are not spinning, in a bonus game, in a free spin and we have user information
	if(!spinning && !inBonusGame && !scatterSpinning && userData)
	{
		//If the user has enough coins to bet this amount
		if(Deduction <= userData.coins)
		{
			//Reset the effects counter
			effectsTimer = 0;
			
			//Reset total payout
			totalPayout = 0.0;
			
			//Turn off winning effects
			displayWinningEffects = false;
			
			//Turn off our coin shower
			csEmittion = coinShower.emission;
			csEmittion.enabled = false;
			
			//Darken the buttons
			DarkenButtons();
			
			//Update the information on our machine
			UpdateText();
			
			//If the audio information has atleast 1 slot open
			if(audioInfo.Length > 0)
			{
				//If the first slot has an audio clip in it
				if(audioInfo[0].audioClip)
				{
					//Adjust the volume to that which we specified
					GetComponent.<AudioSource>().volume = audioInfo[0].audioVolume;
					
					//And play the audio clip one time
					GetComponent.<AudioSource>().PlayOneShot(audioInfo[0].audioClip);
				}
			}
			
			//Deduct the total bet from the users coins
			userData.coins -= Deduction;
			
			//And do not increment it over time
			userData.fluxCoins = userData.coins;
			
			//Add experience to our user
			userData.AddExperience(betAmounts[currentBet] * lineCount);
			
			//Generate entirely new reels
			GenerateNewReels();
			
			//Calculate the payout of this spin
			CalculatePayout();
			
			//Tell our machine to spin
			spinning = true;
			
			//For all the reels
			for(var i = 0; i < 5; i++)
			{
				//Tell the reels to spin
				reelInfo[i].spinning = true;
				
				//Set the volume to our new reels to that which we specified
				reelInfo[i].reel.GetComponent.<AudioSource>().volume = audioInfo[1].audioVolume;
				
				//Remove fade over time
				reelInfo[i].reel.GetComponent.<AudioSource>().rolloffMode = 1;
				
				//And let us here the audio clip no matter where the reel is
				reelInfo[i].reel.GetComponent.<AudioSource>().spatialBlend = 0;
			}
		}
	}
}


//////////Stores the previous symbols that was on the screen//////////
function StorePreviousFaceIcons()
{
	//Resize our list of previous symbols to the amount of symbols that can fit on screen
	System.Array.Resize.<int>(prevFaceIcons, reelInfo.Length * 3);
	
	//If the symbols have been set
	if(iconsSet)
	{
		//The previous symbols on the screen is the same as the ones on the screen right now
		prevFaceIcons = faceIcons;
	}
}


//////////Create a list of symbols that will show up on the screen//////////
function PopulateFaceIcons()
{
	//Resize the list of symbols on screen to the amount that will show up
	System.Array.Resize.<int>(faceIcons, reelInfo.Length * 3);
	
	//Resize the list of sprites on screen to the amount that will show up
	System.Array.Resize.<int>(faceSprites, reelInfo.Length * 3);
	
	//For all the reels
	for(var a = 0; a < reelInfo.Length; a++)
	{
		var extraIcons = a * iconsPerReelDifference;
		
		faceIcons[a * 3] = reelInfo[a].slotOrder[iconsPerReel + extraIcons - 1].ID;
		faceSprites[a * 3] = iconsPerReel + extraIcons - 1;
			
		faceIcons[a * 3 + 1] = reelInfo[a].slotOrder[iconsPerReel + extraIcons - 2].ID;
		faceSprites[a * 3 + 1] = iconsPerReel + extraIcons - 2;
			
		faceIcons[a * 3 + 2] = reelInfo[a].slotOrder[iconsPerReel + extraIcons - 3].ID;
		faceSprites[a * 3 + 2] = iconsPerReel + extraIcons - 3;
	}
}

function CalculatePayout()
{
	//Make sure we do not have any temp bonuses left over
	tempBonusState = 0;
	
	//For all the lines
	for(var line : LineInfo in linesInfo.lineInfo)
	{
		//Turn the physical line off
		line.lineParent.SetActive(false);
		
		//Make sure we have not won anything on this line yet
		line.winningValue = 0;
		
		//Make sure we have not won yet
		line.winner = false;
	}
	
	//A storage to see how many scatters are on the screen
	var scatterCount : int;
	
	//For all the symbols on the screen
	for(var s = 0; s < faceIcons.Length; s++)
	{
		//If we see a scatter
		if(iconInfo[faceIcons[s]].iconType == iconInfo[faceIcons[s]].iconType.Scatter)
		{
			//Add one to our scatter count
			scatterCount += 1;
		}
		
		//If we are at the last symbol on the screen
		if(s == faceIcons.Length - 1)
		{
			//If we have 3 or more scatters on the screen
			if(scatterCount >= 3)
			{
				//Create a multipier incase we have more than 3 scatters
				var scatterMultiplier = scatterCount - 2;
				
				//And give us free spins based on that multiplier and how many scatters are on screen
				tempScatter = scatterCount * scatterMultiplier;
			}
		}
	}
	
	//For all the lines
	for(var a = 0; a < lineCount; a++)
	{
		//Create a storage to hold how many bonus symbols are on this line
		var bonusCount : int;
		
		//For all the symbols on this line
		for(var bo = 0; bo < 5; bo++)
		{
			//If we see a bonus symbol on this line
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[bo]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[bo]]].iconType.Bonus)
			{
				//Add to our storage of bonus symbols
				bonusCount += 1;
			}
			
			//If we are at the last symbol on the line
			if(bo == 4)
			{
				//If we have 3 or more bonus symbols on the line
				if(bonusCount >= 3)
				{
					//Tell our bonus state that we have won this many bonus picks
					tempBonusState = bonusCount;
					
					//And make sure we tell this line that we won on it
					linesInfo.lineInfo[a].winner = true;
				}
			}
		}
		
		//Create a storage to hold which symbol is on the first reel
		var payoutIcon : PayoutInfo = new PayoutInfo();
		
		//If our payout starts from the left
		if(payoutOrder == 0)
		{
			//If the first symbol is not a wild
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType.Wild)
			{
				//Store this symbol as being on the first reel
				payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
			}
			
			//If the first symbol is a wild
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType.Wild)
			{
				//Start from the second symbol and on
				for(var wB = 1; wB < 5; wB++)
				{
					//If the next symbol is a normal symbol
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Normal)
					{
						//Make the wild pay to this symbol
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]];
						
						//End the loop
						wB = 4;
						
						//Break the statement
						break;
					}
					
					//If we are not at the last reel yet
					if(wB < 4)
					{
						//If the next symbol is another wild
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Wild)
						{
							//Continue onto the next symbol
							continue;
						}
					}
					
					//If we are at the last reel
					if(wB == 4)
					{
						//If the next symbol is another wild
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Wild)
						{
							//Do not substitute any other symbol
							payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
							
							//Break the statement
							break;
						}
					}
					
					//If the next symbol is a bonus or a scatter
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Bonus || iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Scatter)
					{
						//Do not substitute any other symbol
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
						
						//End the loop
						wB = 4;
						
						//Break the statement
						break;
					}
				}
			}
			
			
			for(var b = 0; b < 5; b++)
			{
				payoutIcon.amount += 1;
				if(payoutOrder == 0)
				{
					if(b < 4)
					{
						if(payoutIcon.ID != faceIcons[linesInfo.lineInfo[a].lineNumbers[b + 1]] && iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[b + 1]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[b + 1]]].iconType.Wild)
						{
							var Aamount = b + 1;
							var AlIne = a + 1;
							b = 4;
							break;
						}
					}
				}
			}
		}
		
		//If our payout starts from the right
		if(payoutOrder == 1)
		{
			//If the first symbol is not a wild
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType.Wild)
			{
				//Store this symbol as being on the last reel
				payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
			}
			
			//If the first symbol is a wild
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType.Wild)
			{
				//Start from the second symbol and on
				for(var wC = 3; wC > -1; wC--)
				{
					//If the next symbol is a normal symbol
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Normal)
					{
						//Make the wild pay to this symbol
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]];
						
						//End the loop
						wC = 0;
						
						//Break the statement
						break;
					}
					
					//If we are not at the last reel yet
					if(wC > 0)
					{
						//If the next symbol is another wild
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Wild)
						{
							//Continue onto the next symbol
							continue;
						}
					}
					
					//If we are at the last reel
					if(wC == 0)
					{
						//If the next symbol is another wild
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Wild)
						{
							//Do not substitute any other symbol
							payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
							
							//Break the statement
							break;
						}
					}
					
					//If the next symbol is a bonus or a scatter
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Bonus || iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Scatter)
					{
						//Do not substitute any other symbol
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
						
						//End the loop
						wC = 0;
						
						//Break the statement
						break;
					}
				}
			}
			for(var c = 4; c > -1; c--)
			{
				payoutIcon.amount += 1;
				if(c > 0)
				{
					if(payoutIcon.ID != faceIcons[linesInfo.lineInfo[a].lineNumbers[c - 1]] && iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[c - 1]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[c - 1]]].iconType.Wild)
					{
						var Damount = 5 - c;
						var DlIne = a + 1;
						c = 0;
						break;
					}
				}
			}
		}
		
		if(iconInfo[payoutIcon.ID].xTwo > 0)
		{
			if(iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Normal || iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Wild)
			{
				linesInfo.lineInfo[a].winningValue = iconInfo[payoutIcon.ID].xTwo * betAmounts[currentBet];
				linesInfo.lineInfo[a].winner = true;
				linesInfo.lineInfo[a].winningIconIDs = new int[2];
				if(payoutOrder == 0)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.firstReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.secondReel;
				}
				if(payoutOrder == 1)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.fifthReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.forthReel;
				}
			}
		}
		if(payoutIcon.amount == 3)
		{
			if(iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Normal || iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Wild)
			{
				linesInfo.lineInfo[a].winningValue = iconInfo[payoutIcon.ID].xThree * betAmounts[currentBet];
				linesInfo.lineInfo[a].winner = true;
				linesInfo.lineInfo[a].winningIconIDs = new int[3];
				if(payoutOrder == 0)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.firstReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.secondReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
				}
				if(payoutOrder == 1)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.fifthReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.forthReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
				}
			}
		}
		if(payoutIcon.amount == 4)
		{
			if(iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Normal || iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Wild)
			{
				linesInfo.lineInfo[a].winningValue = iconInfo[payoutIcon.ID].xFour * betAmounts[currentBet];
				linesInfo.lineInfo[a].winner = true;
				linesInfo.lineInfo[a].winningIconIDs = new int[4];
				if(payoutOrder == 0)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.firstReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.secondReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
					linesInfo.lineInfo[a].winningIconIDs[3] = linesInfo.lineInfo[a].LineNumbers.forthReel;
				}
				if(payoutOrder == 1)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.fifthReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.forthReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
					linesInfo.lineInfo[a].winningIconIDs[3] = linesInfo.lineInfo[a].LineNumbers.secondReel;
				}
			}
		}
		if(payoutIcon.amount == 5)
		{
			if(iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Normal || iconInfo[payoutIcon.ID].iconType == iconInfo[payoutIcon.ID].iconType.Wild)
			{
				linesInfo.lineInfo[a].winningValue = iconInfo[payoutIcon.ID].xFive * betAmounts[currentBet];
				linesInfo.lineInfo[a].winner = true;
				linesInfo.lineInfo[a].winningIconIDs = new int[5];
				if(payoutOrder == 0)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.firstReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.secondReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
					linesInfo.lineInfo[a].winningIconIDs[3] = linesInfo.lineInfo[a].LineNumbers.forthReel;
					linesInfo.lineInfo[a].winningIconIDs[4] = linesInfo.lineInfo[a].LineNumbers.fifthReel;
				}
				if(payoutOrder == 1)
				{
					linesInfo.lineInfo[a].winningIconIDs[0] = linesInfo.lineInfo[a].LineNumbers.fifthReel;
					linesInfo.lineInfo[a].winningIconIDs[1] = linesInfo.lineInfo[a].LineNumbers.forthReel;
					linesInfo.lineInfo[a].winningIconIDs[2] = linesInfo.lineInfo[a].LineNumbers.thirdReel;
					linesInfo.lineInfo[a].winningIconIDs[3] = linesInfo.lineInfo[a].LineNumbers.secondReel;
					linesInfo.lineInfo[a].winningIconIDs[4] = linesInfo.lineInfo[a].LineNumbers.firstReel;
				}
			}
		}
	}
}

function StopReel(key : int)
{
	reelInfo[key].spinning = false;
	
	if(audioInfo.Length > 1)
	{
		if(audioInfo[1].audioClip)
		{
			reelInfo[key].reel.GetComponent.<AudioSource>().PlayOneShot(audioInfo[1].audioClip);
		}
	}
	
	if(key == 4)
	{
		spinning = false;
		curSpinSpeed = 0;
		GetComponent.<AudioSource>().Stop();
		
		var payout : float;
		
		for(var line : LineInfo in linesInfo.lineInfo)
		{
			if(line.winningValue > 0.0)
			{
				payout += line.winningValue;
			}
			if(line.winner)
			{
				for(var i = 0; i < line.winningIconIDs.Length; i++)
				{
					if(payoutOrder == 0)
					{
						reelInfo[i].slotOrder[reelInfo[i].slotOrder.Length - 1 - line.winningIconIDs[i]].canAnimate = true;
					}
					if(payoutOrder == 1)
					{
						reelInfo[4 - i].slotOrder[reelInfo[4 - i].slotOrder.Length - 1 - line.winningIconIDs[i]].canAnimate = true;
					}
				}
				line.winningIconIDs = new int[0];
			}
		}
		if(tempScatter > 0)
		{
			scatterTimer = 2;
			scattersLeft += tempScatter;
			tempScatter = 0;
			if(tempBonusState == 0 && specialAudio)
			{
				if(specialAudio.isPlaying)
				{
					specialAudio.Stop();
				}
				specialAudio.volume = audioInfo[2].audioVolume;
				specialAudio.PlayOneShot(audioInfo[2].audioClip);
			}
		}
		if(tempBonusState > 0)
		{
			picks = tempBonusState;
			BonusFade();
		}
		if(payout > 0.0)
		{
			AddCoins(payout, true);
			displayWinningEffects = true;
		}
		if(scattersLeft == 0)
		{
			LightenButtons();
		}
		for(var a = 0; a < reelInfo.Length; a++)
		{
			CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 1);
			CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 2);
			CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 3);
		}
		UpdateText();
	}
}

function EngageScatters()
{
	if(!scatterObject.activeSelf)
	{
		scatterObject.SetActive(true);
	}
	if(!spinning && !inBonusGame)
	{
		scatterTimer -= Time.deltaTime;
	}
	if(spinning && scatterTimer != 3)
	{
		scatterTimer = 3;
	}
	if(scatterTimer < 0)
	{
		Spin(0.0);
		scatterTimer = 3;
		scattersLeft -= 1;
		if(scattersLeft == 0)
		{
			scatterObject.SetActive(false);
		}
	}
}

function BonusFade()
{
	inBonusGame = true;
	if(scatterObject.activeSelf)
	{
		scatterObject.SetActive(false);
	}
	bonusInfo.bonusAmountText.text = tempBonusState.ToString();
	bonusInfo.bonusInfoParent.SetActive(true);
	RandomArrangement(bonusInfo.winningAmounts);
	
	if(GetComponent.<AudioSource>().isPlaying)
	{
		GetComponent.<AudioSource>().Stop();
	}
	if(audioInfo.Length > 3)
	{
		specialAudio.PlayOneShot(audioInfo[3].audioClip);
	}
	bonusInfo.bonusText.GetComponent.<Animation>().Play("ShowBonusWord");
	
	yield WaitForSeconds(3.1);
	
	tempBonusState = 0;
	displayWinningEffects = false;
	csEmittion = coinShower.emission;
	csEmittion.enabled = false;
	for(var a = 0; a < linesInfo.lineInfo.Length; a++)
	{
		linesInfo.lineInfo[a].lineParent.SetActive(false);
	}
	fadeValue = 0;
	userData.fluxCoins = userData.coins;
	for(var reel : ReelInfo in reelInfo)
	{
		reel.reel.SetActive(false);
	}
	if(audioInfo.Length > 4)
	{
		specialAudio.PlayOneShot(audioInfo[4].audioClip);
	}
	bonusInfo.bonusBackground.GetComponent.<Animation>().Play("BonusStart");
	if(audioInfo.Length > 5)
	{
		bonusInfo.bonusBackground.GetComponent.<AudioSource>().loop = true;
		bonusInfo.bonusBackground.GetComponent.<AudioSource>().clip = audioInfo[5].audioClip;
		bonusInfo.bonusBackground.GetComponent.<AudioSource>().Play();
	}
	for(var i = 0; i < bonusInfo.bonusItemInfo.Length; i++)
	{
		bonusInfo.bonusItemInfo[i].object.GetComponent.<Renderer>().enabled = true;
		bonusInfo.bonusItemInfo[i].object.GetComponent.<Collider>().enabled = true;
		bonusInfo.bonusItemInfo[i].object.GetComponent.<BonusObjectValue>().Value = bonusInfo.winningAmounts[i] * betAmounts[currentBet];
	}
}

function RandomArrangement(values : float[])
{
	for(var i = values.Length - 1; i > 0; i--)
	{
		var r = Random.Range(0, i);
		var tmp = values[i];
		values[i] = values[r];
		values[r] = tmp;
	}
}

function CheckPicks()
{
	if(picks == 0)
	{
		yield WaitForSeconds(1);
		EndBonusGame();
	}
}

function EndBonusGame()
{
	picks = 0;
	bonusInfo.bonusInfoParent.SetActive(false);
	for(var i = 0; i < bonusInfo.bonusItemInfo.Length; i++)
	{
		bonusInfo.bonusItemInfo[i].object.GetComponent.<Renderer>().enabled = false;
		bonusInfo.bonusItemInfo[i].object.GetComponent.<Collider>().enabled = false;
		bonusInfo.bonusItemInfo[i].object.GetComponent.<BonusObjectValue>().displayValue = true;
	}
	
	yield WaitForSeconds(2);
	
	for(var j = 0; j < bonusInfo.bonusItemInfo.Length; j++)
	{
		bonusInfo.bonusItemInfo[j].object.GetComponent.<BonusObjectValue>().displayValue = false;
		bonusInfo.bonusItemInfo[j].valueOpacity = 0;
	}
	if(bonusInfo.bonusBackground.GetComponent.<Animation>()["BonusEnd"])
	{
		bonusInfo.bonusBackground.GetComponent.<Animation>().Play("BonusEnd");
	}
	if(audioInfo.Length > 7)
	{
		if(audioInfo[7].audioClip)
		{
			specialAudio.GetComponent.<AudioSource>().volume = audioInfo[7].audioVolume;
			specialAudio.GetComponent.<AudioSource>().PlayOneShot(audioInfo[7].audioClip);
		}
	}
	
	inBonusGame = false;
	
	yield WaitForSeconds(1);
	
	fadeValue = 1.0;
	AddCoins(bonusWinnings, true);
	displayWinningEffects = true;
	bonusWinnings = 0;
	UpdateText();
	
	yield WaitForSeconds(1);
	
	if(bonusInfo.bonusBackground.GetComponent.<AudioSource>().isPlaying)
	{
		bonusInfo.bonusBackground.GetComponent.<AudioSource>().Stop();
	}
	
	for(var reel : ReelInfo in reelInfo)
	{
		reel.reel.SetActive(true);
	}
}

function IncreaseLines()
{
	if(!spinning && !inBonusGame && !scatterSpinning)
	{
		if(lineCount < linesInfo.lineInfo.Length)
		{
			lineCount += 1;
		}
		else
		{
			lineCount = 1;
		}
		UpdateText();
		SetVisuals();
	}
}

function DecreaseLines()
{
	if(!spinning && !inBonusGame && !scatterSpinning)
	{
		if(lineCount > 1)
		{
			lineCount -= 1;
		}
		else
		{
			lineCount = linesInfo.lineInfo.Length;
		}
		UpdateText();
		SetVisuals();
	}
}

function SetVisuals()
{
	displayWinningEffects = false;
	for(var a = 1; a < linesInfo.lineInfo.Length + 1; a++)
	{
		if(a <= lineCount)
		{
			linesInfo.lineInfo[a - 1].lineParent.SetActive(true);
		}
		if(a > lineCount)
		{
			linesInfo.lineInfo[a - 1].lineParent.SetActive(false);
		}
	}
}

function IncreaseBet()
{
	if(!spinning && !inBonusGame && !scatterSpinning)
	{
		if(currentBet == maxBet)
		{
			currentBet = 0;
		}
		else
		{
			currentBet += 1;
		}
		UpdateText();
	}
}

function DecreaseBet()
{
	if(!spinning && !inBonusGame && !scatterSpinning)
	{
		if(currentBet == 0)
		{
			currentBet = maxBet;
		}
		else
		{
			currentBet -= 1;
		}
		UpdateText();
	}
}

function GenerateLineInfo()
{
	for(var a = 0; a < 5; a++)
	{
		for(var b = 0; b < 3; b++)
		{
			linePositions[a * 3 + b] = reelInfo[a].slotOrder[reelInfo[a].slotOrder.Length - 1 - b].sprite.transform.position + Vector3(reelInfo[a].slotOrder[reelInfo[a].slotOrder.Length - 1 - b].size.x / 2 , 0, -0.5);
		}
	}
	for(var i = 0; i < linesInfo.lineInfo.Length; i++)
	{
		if(linesInfo.lineInfo[i].lineParent)
		{
			linesInfo.lineInfo[i].lineParent.SetActive(false);
			linesInfo.lineInfo[i].lineParent.GetComponent.<Renderer>().material = new Material(linesInfo.lineShader);
			linesInfo.lineInfo[i].lineParent.GetComponent.<Renderer>().sharedMaterial.color = linesInfo.lineInfo[i].thisColor;
			
			System.Array.Resize.<int>(linesInfo.lineInfo[i].lineNumbers, 5);
			linesInfo.lineInfo[i].lineNumbers[0] = linesInfo.lineInfo[i].LineNumbers.firstReel;
			linesInfo.lineInfo[i].lineNumbers[1] = linesInfo.lineInfo[i].LineNumbers.secondReel + 3;
			linesInfo.lineInfo[i].lineNumbers[2] = linesInfo.lineInfo[i].LineNumbers.thirdReel + 6;
			linesInfo.lineInfo[i].lineNumbers[3] = linesInfo.lineInfo[i].LineNumbers.forthReel + 9;
			linesInfo.lineInfo[i].lineNumbers[4] = linesInfo.lineInfo[i].LineNumbers.fifthReel + 12;
			
			if(linesInfo.lineInfo[i].lineBoxPosition.x > 0)
			{
				ReverseLineVisuals(i);
			}
			else
			{
				LineVisuals(i);
			}
		}
	}
}

function GenerateNewLine()
{
	if(!lines)
	{
		var lineGrandparent = new GameObject();
		lineGrandparent.name = "LineManager";
		lines = lineGrandparent;
	}
	
	var lineParent = new GameObject();
	lineParent.AddComponent.<LineRenderer>();
	lineParent.name = "NewLine";
	for(var l = 0; l < 5; l++)
	{
		var lineChild = new GameObject();
		lineChild.AddComponent.<LineRenderer>();
		lineChild.name = "Segment " + l.ToString();
		lineChild.transform.parent = lineParent.transform;
	}
	lineParent.transform.parent = lines.transform;
	lineParent.SetActive(false);
	generatingLine = false;
}

function LineVisuals(ID : int)
{
    var lR = linesInfo.lineInfo[ID].lineParent.GetComponent(LineRenderer);
    lR.SetPosition(0, linesInfo.lineInfo[ID].lineBoxPosition + Vector3(0.5, 0, -0.5));
    lR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[0]]);
    lR.startWidth = linesInfo.lineWidth;
    lR.endWidth = linesInfo.lineWidth;
	
    var parentObject : Transform;
    parentObject = linesInfo.lineInfo[ID].lineParent.transform;
	
    for(var i = 0; i < 5; i++)
    {
        var child : Transform;
        child = linesInfo.lineInfo[ID].lineParent.transform.GetChild(i);
        child.GetComponent.<Renderer>().material = parentObject.gameObject.GetComponent.<Renderer>().sharedMaterial;
		
        var cLR : LineRenderer = child.GetComponent(LineRenderer);
        cLR.SetPosition(0, linePositions[linesInfo.lineInfo[ID].lineNumbers[i]]);
        cLR.startWidth = linesInfo.lineWidth;
        cLR.endWidth = linesInfo.lineWidth;
		
        if(i < 4)
        {
            cLR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[i + 1]]);
            cLR.startWidth = linesInfo.lineWidth;
            cLR.endWidth = linesInfo.lineWidth;
        }
        else
        {
            cLR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[i]] + Vector3(5, 0, -0.5));
            cLR.startWidth = linesInfo.lineWidth;
            cLR.endWidth = linesInfo.lineWidth;
        }
        parentObject = child;
    }
}

function ReverseLineVisuals(ID : int)
{
    var lR = linesInfo.lineInfo[ID].lineParent.GetComponent(LineRenderer);
    lR.SetPosition(0, linesInfo.lineInfo[ID].lineBoxPosition - Vector3(0.5, 0, -0.5));
    lR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[4]]);
    lR.startWidth = linesInfo.lineWidth;
    lR.endWidth = linesInfo.lineWidth;
	
    var parentObject : Transform;
    parentObject = linesInfo.lineInfo[ID].lineParent.transform;
	
    for(var i = 4; i > -1; i--)
    {
        var child : Transform;
        child = linesInfo.lineInfo[ID].lineParent.transform.GetChild(i);
        child.GetComponent.<Renderer>().sharedMaterial = parentObject.GetComponent.<Renderer>().sharedMaterial;
		
        var cLR = child.GetComponent(LineRenderer);
        cLR.SetPosition(0, linePositions[linesInfo.lineInfo[ID].lineNumbers[i]]);
        cLR.startWidth = linesInfo.lineWidth;
        cLR.endWidth = linesInfo.lineWidth;
		
        if(i > 0)
        {
            cLR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[i - 1]]);
            cLR.startWidth = linesInfo.lineWidth;
            cLR.endWidth = linesInfo.lineWidth;
        }
        else
        {
            cLR.SetPosition(1, linePositions[linesInfo.lineInfo[ID].lineNumbers[i]] - Vector3(5, 0, -0.5));
            cLR.startWidth = linesInfo.lineWidth;
            cLR.endWidth = linesInfo.lineWidth;
        }
        parentObject = child;
    }
}

function UpdateAmountOfReels()
{
	System.Array.Resize.<ReelInfo>(reelInfo, 5);
	for(var i = 0; i < 5; i++)
	{
		reelInfo[i] = new ReelInfo();
		reelInfo[i].reel = new GameObject();
		reelInfo[i].reel.name = "Reel " + i.ToString();
		reelInfo[i].reel.transform.parent = transform;
		reelInfo[i].reel.AddComponent.<AudioSource>();
		reelInfo[i].reel.GetComponent.<AudioSource>().playOnAwake = false;
	}
}

function UpdateIconsPerReel()
{
	for(var a = 0; a < reelInfo.Length; a++)
	{
		var extraIcons = a * iconsPerReelDifference;
		System.Array.Resize.<SlotInfo>(reelInfo[a].slotOrder, iconsPerReel + extraIcons);
		for(var i = 0; i < iconsPerReel + extraIcons; i++)
		{
			reelInfo[a].slotOrder[i] = new SlotInfo();
			var newSprite = new GameObject();
			newSprite.AddComponent.<SpriteRenderer>();
			newSprite.name = "Slot " + i.ToString();
			reelInfo[a].slotOrder[i].sprite = newSprite;
			reelInfo[a].slotOrder[i].sprite.transform.localScale = Vector3(iconSize, iconSize, 1);
			if(iconInfo.Length > 0)
			{
				var randomIcon : int;
				for(;;)
				{
					randomIcon = Random.Range(0, iconInfo.Length - 1);
					var dividend = parseFloat(iconInfo[randomIcon].frequency) + 1;
					var randomValue = Random.value;
					if(1/dividend > randomValue)
					{
						break;
					}
				}
				if(!iconsSet)
				{
					reelInfo[a].slotOrder[i].ID = randomIcon;
				}
				if(iconsSet)
				{
					if(i < 3)
					{
						var row = 2 - i;
						reelInfo[a].slotOrder[i].ID = prevFaceIcons[a * 3 + row];
					}
					else
					{
						reelInfo[a].slotOrder[i].ID = randomIcon;
					}
				}
				reelInfo[a].slotOrder[i].sprite.GetComponent.<SpriteRenderer>().sprite = iconInfo[reelInfo[a].slotOrder[i].ID].sprite;
				reelInfo[a].slotOrder[i].size = Vector2(reelInfo[a].slotOrder[i].sprite.GetComponent.<SpriteRenderer>().bounds.extents.x * 2, reelInfo[a].slotOrder[i].sprite.GetComponent.<SpriteRenderer>().bounds.extents.y * 2);
				reelInfo[a].slotOrder[i].sprite.transform.position = Vector3(a * reelInfo[a].slotOrder[i].size.x - reelInfo[a].slotOrder[i].size.x * 2.5, reelInfo[a].reel.transform.position.y + i * reelInfo[a].slotOrder[i].size.y, 0);
			}
			newSprite.transform.parent = reelInfo[a].reel.transform;
		}
		RepositionReel(a, -reelInfo[a].slotOrder[0].size.y);
		var offset = iconsPerReel + extraIcons - 2;
		reelInfo[a].targetPosition = reelInfo[a].slotOrder[0].size.y * -offset;
	}
	prevIconCount = iconsPerReel;
}

function RepositionReel(ID : int, yPos : float)
{
	reelInfo[ID].reel.transform.position.y = yPos;
}

function CreateLine()
{
	generatingLine = true;
}

function RemovePreviousReels()
{
	if(reelInfo.Length > 0)
	{
		for(var info : ReelInfo in reelInfo)
		{
			if(info.slotOrder.Length > 0)
			{
				for(var i = 0; i < info.slotOrder.Length; i++)
				{
					DestroyImmediate(info.slotOrder[i].sprite);
				}
			}
			DestroyImmediate(info.reel);
		}
	}
}

function AddCoins(amount : float, increment : boolean)
{
	if(userData)
	{
		userData.AddCoins(amount, increment, currentBet);
	}
	totalPayout += amount;
}

function AddExperience(amount : float)
{
	if(userData)
	{
		userData.AddExperience(amount);
	}
}

function OnGUI()
{
    ///Enable this to test bonus games outside of the editor
    /*
    if(spinning)
    {
        if(GUILayout.Button("Force Bonus"))
        {
            tempBonusState = 3;
        }
    }
    */

	//Access all of the lines information
	for(var l = 0; l < linesInfo.lineInfo.Length; l++)
	{
		//Align the words on the middle left
		GUI.skin.label.alignment = TextAnchor.MiddleLeft;
		
		//Store the screen position of the lineBlock
		var screenPos : Vector3 = GetComponent.<Camera>().WorldToScreenPoint(linesInfo.lineInfo[l].lineBoxPosition);
		
		//And convert the screen position to gui position
		var guiPos : Vector2 = Vector2(screenPos.x, Screen.height - screenPos.y);
		
		//Make sure that the color is the same as we specified
		GUI.color = linesInfo.lineInfo[l].thisColor;
		
		//And draw the lineBlock image
		GUI.DrawTexture(Rect(guiPos.x - linesInfo.lineBoxSize.x/2, guiPos.y - linesInfo.lineBoxSize.y/2, linesInfo.lineBoxSize.x, linesInfo.lineBoxSize.y), linesInfo.lineBlock);
		
		//Then add 1 to our line number so that there is no line 0
		var thisLineNumber : int = l + 1;
		
		//Change the color to black
		GUI.color = Color.black;
		
		//Align the words in the center
		GUI.skin.label.alignment = TextAnchor.MiddleCenter;
		
		GUI.skin.label.fontSize = linesInfo.lineNumberSize;
		
		//And display the line number on top of the lineBlock image
		GUI.Label(Rect(guiPos.x - 25, guiPos.y - 25, 50, 50), thisLineNumber.ToString());
		
		GUI.skin.label.fontSize = 0;
	}
	
	if(inBonusGame)
	{
		//Access all of our clickable bonus objects
		for(var obj : BonusItemInfo in bonusInfo.bonusItemInfo)
		{
			if(obj.object)
			{
				//And store the script that is attached to it
				var objScript = obj.object.GetComponent.<BonusObjectValue>();
				
				
				//If our stored script says that we should display how much it is worth
				if(objScript.displayValue)
				{
					//Store the position of the clickable object in screen space
					var itemScreenPos : Vector3 = bonusInfo.bonusCamera.WorldToScreenPoint(obj.object.transform.position);
					
					//And convert that position into gui space
					var itemGuiPos : Vector2 = Vector2(itemScreenPos.x + 15, Screen.height - itemScreenPos.y);
					
					//Change our fade value
					obj.valueOpacity = Mathf.Lerp(obj.valueOpacity, 1, Time.deltaTime);
					
					//And fade the text
					GUI.color = new Color(1, 1, 1, obj.valueOpacity);
					
					//And display our text with our faded amount
					GUI.Label(Rect(itemGuiPos.x - 25, itemGuiPos.y - 15, 50, 30), objScript.Value.ToString());
				}
			}
		}
	}
	GUI.color = Color.white;
	if(showPayTable)
	{
		GUI.BeginGroup(Rect(Screen.width/2 - 205, Screen.height/2 - 165, 410, 330), "PayTable", "Box");
		GUI.DrawTexture(Rect(5, 25, 400, 300), payTableImage);
		if(GUI.Button(Rect(380, 2.5, 25, 20), "X"))
		{
			showPayTable = false;
		}
		GUI.EndGroup();
	}
}

@script ExecuteInEditMode()