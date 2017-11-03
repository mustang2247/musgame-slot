import UnityEngine.SceneManagement;

//The coin shower particle effect
public var coinShower : ParticleSystem;

public var explosionParticle : ParticleSystem;

public var trapDoors : SpriteRenderer[];

public var elbowPositions : Vector2[];

//The special audio source
public var specialAudio : AudioSource;

//The object shown when we have free spins
public var scatterObject : GameObject;

//The text object that displays the free spin count
public var scatterCountObject : TextMesh;

//Paytable image that is displayed
public var payTableImage : Texture2D;

//Toggle between two different pay line directions
//enum PayoutOrder{fromLeft, fromRight};
public var payoutOrder : PayoutOrder;

//The size of each symbol (Restricted between 0 and 5)
@Range(0, 5)
public var iconSize : float;

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

//The line parent object
public var lines : GameObject;

//An array of reel information (Hidden in inspector)
//@HideInInspector
public var reelInfo : ReelInfo[];

//Stores scatter wins until all reels have stopped (Hidden in inspector)
@HideInInspector
public var tempScatter : int = 0;

//A toggle to notify us that we are spinning (Hidden in inspector)
@HideInInspector
public var spinning : boolean;

@HideInInspector
public var dropping : boolean;

private var userData : UserData;
private var currentSymbolBundle : GameObject;
private var displayWinningEffects : boolean;
private var generatingSymbols : boolean;
private var generatingLine : boolean;
private var showPayTable : boolean;
private var touching : boolean;
private var scattersLeft : int;
private var lineCount : int;
private var scatterTimer : float;
private var effectsTimer : float;
private var totalPayout : float;
private var fadeValue : float;
private var faceIcons : int[];
private var currentBet : int = 3;
private var picks : int = 0;
private var linePositions : Vector3[] = new Vector3[15];
private var csEmittion : ParticleSystem.EmissionModule;

function Awake()
{
	generatingSymbols = true;
	
	//If we an object in the scene with the tag Player
	if(GameObject.FindWithTag("Player"))
	{
		//Store that object as our users information object
		userData = GameObject.FindWithTag("Player").GetComponent.<UserData>();
	}
	
	System.Array.Resize.<int>(faceIcons, 15);
	System.Array.Resize.<ReelInfo>(reelInfo, 5);
	for(var a = 0; a < 5; a++)
	{
		reelInfo[a] = new ReelInfo();
		System.Array.Resize.<SlotInfo>(reelInfo[a].slotOrder, 3);
		for(var b = 0; b < 3; b++)
		{
			reelInfo[a].slotOrder[b] = new SlotInfo();
			reelInfo[a].slotOrder[b].ID = GenerateNewID();
		}
	}
	
	if(audioInfo[3].audioClip)
	{
		GetComponent.<AudioSource>().PlayOneShot(audioInfo[3].audioClip);
	}
	
	//Turn off our scatter display
	scatterObject.SetActive(false);
	
    //Turn off the coin shower effect
	csEmittion = coinShower.emission;
	csEmittion.enabled = false;
	
	//Generate entirely new reels
	GenerateNewColumns();
	
	//Calculate line positions
	GenerateLineInfo();
	
	//Start with max lines
	lineCount = linesInfo.lineInfo.Length;
	
	//Populate the faceicon list without generating new symbols
	PopulateFaceIcons(false);
	
	//Update interface text
	UpdateText();
	
	//Ensure we can see the reels
	fadeValue = 1;
}

function Update()
{
	//If we left click
	if(Input.GetMouseButtonDown(0))
	{
		Click(Input.mousePosition);
	}
	if(Input.touchCount > 0 && !touching)
	{
		if(Input.GetTouch(0).phase == TouchPhase.Began && !touching) 
		{
			touching = true;
			Click(Input.GetTouch(0).position);
		}
	}
	if(Input.touchCount == TouchPhase.Ended || Input.touchCount == TouchPhase.Canceled)
	{
		if(touching)
		{
			touching = false;
		}
	}
	if(displayWinningEffects)
	{
	    csEmittion = coinShower.emission;
		if(userData.fluxCoins != userData.coins && csEmittion.enabled == false)
		{
			csEmittion.enabled = true;
		}
		if(userData.fluxCoins == userData.coins && csEmittion.enabled == true)
		{
			csEmittion.enabled = false;
		}
		
		effectsTimer += Time.deltaTime;
		
		for(var line : LineInfo in linesInfo.lineInfo)
		{
			if(line.winner)
			{
				if(effectsTimer < 0.75 && !line.lineParent.activeSelf)
				{
					line.lineParent.SetActive(true);
				}
				if(effectsTimer > 0.75)
				{
					if(line.lineParent.activeSelf)
					{
						line.lineParent.SetActive(false);
					}
					if(effectsTimer >= 1)
					{
						effectsTimer = 0.0;
					}
				}
			}
		}
	}
	if(scattersLeft > 0)
	{
		if(scatterCountObject.text != scattersLeft.ToString())
		{
			scatterCountObject.text = scattersLeft.ToString();
		}
		EngageScatters();
	}
	if(spinning)
	{
		for(var h = 0; h < 5; h++)
		{
			for(var i = 0; i < 3; i++)
			{
				if(!reelInfo[h].slotOrder[i].collided)
				{
					if(reelInfo[h].slotOrder[i].sprite.gameObject.GetComponent.<Rigidbody2D>().velocity.y >= 0 && reelInfo[h].slotOrder[i].sprite.transform.position.y < 5)
					{
						if(audioInfo.Length > 0)
						{
							reelInfo[h].slotOrder[i].sprite.gameObject.GetComponent.<AudioSource>().PlayOneShot(audioInfo[0].audioClip);
						}
						reelInfo[h].slotOrder[i].collided = true;
					}
				}
				if(reelInfo[h].slotOrder[i].collided)
				{
					if(reelInfo[h].slotOrder[i].sprite.gameObject.GetComponent.<Rigidbody2D>().velocity.y < -0.1)
					{
						reelInfo[h].slotOrder[i].collided = false;
					}
				}
			}
		}
		if(reelInfo[4].slotOrder[2].sprite.gameObject.GetComponent.<Rigidbody2D>().velocity.y >= 0 && reelInfo[4].slotOrder[2].sprite.transform.position.y < 5)
		{
			CheckForWinningSymbols();
		}
	}
}

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

function GenerateNewColumns()
{
	if(currentSymbolBundle != null)
	{
		Destroy(currentSymbolBundle);
	}
	
	currentSymbolBundle = new GameObject();
	currentSymbolBundle.name = "Symbols";
	
	for(var c = 0; c < 5; c++)
	{
		for(var s = 0; s < 3; s++)
		{
			SpawnSymbol(c, s);
			yield WaitForSeconds(0.05);
		}
	}
	generatingSymbols = false;
	spinning = true;
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

function GenerateLineInfo()
{
	for(var a = 0; a < 5; a++)
	{
		for(var b = 0; b < 3; b++)
		{
			linePositions[a * 3 + b] = Vector3(elbowPositions[a * 3 + b].x, elbowPositions[a * 3 + b].y, -0.5);
		}
	}
	for(var i = 0; i < linesInfo.lineInfo.Length; i++)
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

function EngageScatters()
{
	if(!scatterObject.activeSelf)
	{
		scatterObject.SetActive(true);
	}
	if(!spinning)
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

function IncreaseLines()
{
	if(!spinning && scattersLeft == 0 && !dropping)
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
	if(!spinning && scattersLeft == 0 && !dropping)
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

function DisableAllVisuals()
{
	displayWinningEffects = false;
	for(var a = 1; a < linesInfo.lineInfo.Length + 1; a++)
	{
		linesInfo.lineInfo[a - 1].lineParent.SetActive(false);
	}
	csEmittion = coinShower.emission;
	csEmittion.enabled = false;
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
	if(!spinning && scattersLeft == 0 && !dropping)
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
	if(!spinning && scattersLeft == 0 && !dropping)
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

function Spin(Deduction : float)
{
	if(!spinning && !dropping && !generatingSymbols && userData)
	{
		if(Deduction <= userData.coins)
		{
			if(audioInfo[1].audioClip)
			{
				GetComponent.<AudioSource>().PlayOneShot(audioInfo[1].audioClip);
			}
			dropping = true;
			totalPayout = 0.0;
			DisableAllVisuals();
			userData.coins -= Deduction;
			userData.fluxCoins = userData.coins;
			userData.AddExperience(betAmounts[currentBet] * lineCount);
			UpdateText();
			DarkenButtons();
			generatingSymbols = true;
			
			var t : int;
			for(t = 0; t < 5; t++)
			{
				trapDoors[t].gameObject.SetActive(false);
				yield WaitForSeconds(0.1);
			}
			
			yield WaitForSeconds(0.5);
			
			PopulateFaceIcons(true);
			
			CalculatePayout();
			
			GenerateNewColumns();
			
			for(t = 0; t < 5; t++)
			{
				trapDoors[t].gameObject.SetActive(true);
			}
			if(audioInfo[3].audioClip)
			{
				GetComponent.<AudioSource>().PlayOneShot(audioInfo[3].audioClip);
			}
		}
	}
}

function PopulateFaceIcons(Repopulate : boolean)
{
	for(var y = 0; y < 5; y++)
	{
		for(var z = 0; z < 3; z++)
		{
			if(Repopulate)
			{
				reelInfo[y].slotOrder[z].ID = GenerateNewID();
			}
			var topToBottom = 2 - z;
			faceIcons[y * 3 + topToBottom] = reelInfo[y].slotOrder[z].ID;
		}
	}
}

function GenerateNewID()
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
	return randomIcon;
}

function CalculatePayout()
{
	for(var line : LineInfo in linesInfo.lineInfo)
	{
		line.lineParent.SetActive(false);
		line.winningValue = 0;
		line.winner = false;
	}
	
	var scatterCount : int;
	
	for(var s = 0; s < faceIcons.Length; s++)
	{
		if(iconInfo[faceIcons[s]].iconType == iconInfo[faceIcons[s]].iconType.Scatter)
		{
			scatterCount += 1;
		}
		if(s == faceIcons.Length - 1)
		{
			if(scatterCount >= 3)
			{
				var scatterMultiplier = scatterCount - 2;
				tempScatter = scatterCount * scatterMultiplier;
			}
		}
	}
	
	for(var a = 0; a < lineCount; a++)
	{
		var payoutIcon : PayoutInfo = new PayoutInfo();
		
		if(payoutOrder == 0)
		{
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType.Wild)
			{
				payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
			}
			
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[0]]].iconType.Wild)
			{
				for(var wB = 1; wB < 5; wB++)
				{
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Normal)
					{
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]];
						wB = 4;
						break;
					}
					if(wB < 4)
					{
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Wild)
						{
							continue;
						}
					}
					if(wB == 4)
					{
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Wild)
						{
							payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
							break;
						}
					}
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wB]]].iconType.Scatter)
					{
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[0]];
						wB = 4;
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
		if(payoutOrder == 1)
		{
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType != iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType.Wild)
			{
				payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
			}
			
			if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[4]]].iconType.Wild)
			{
				for(var wC = 3; wC > -1; wC--)
				{
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Normal)
					{
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]];
						wC = 0;
						break;
					}
					if(wC > 0)
					{
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Wild)
						{
							continue;
						}
					}
					if(wC == 0)
					{
						if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Wild)
						{
							payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
							break;
						}
					}
					if(iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType == iconInfo[faceIcons[linesInfo.lineInfo[a].lineNumbers[wC]]].iconType.Scatter)
					{
						payoutIcon.ID = faceIcons[linesInfo.lineInfo[a].lineNumbers[4]];
						wC = 0;
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
			if(payoutIcon.amount == 2)
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

function ExplodeSymbol(r : int, n : int)
{
	yield WaitForSeconds(1);
	if(audioInfo[4].audioClip)
	{
		GetComponent.<AudioSource>().PlayOneShot(audioInfo[4].audioClip);
	}
	Instantiate(explosionParticle, reelInfo[r].slotOrder[2 - n].sprite.transform.position + Vector3(reelInfo[r].slotOrder[2 - n].size.x/2, reelInfo[r].slotOrder[2 - n].size.y/2, 0) , Quaternion.Euler(0, 180, 0));
	Destroy(reelInfo[r].slotOrder[2 - n].sprite);
}

function CheckForWinningSymbols()
{
	var payout : float = 0.0;
	var winningSlots : String[]= new String[15];
		
	for(var line : LineInfo in linesInfo.lineInfo)
	{
		if(line.winningValue > 0.0)
		{
			payout += line.winningValue;
		}
		if(line.winner)
		{
			if(!displayWinningEffects)
			{
				displayWinningEffects = true;
			}
			for(var i = 0; i < line.winningIconIDs.Length; i++)
			{
				var inSet : int = i * 3;
				if(payoutOrder == 0)
				{
					reelInfo[i].slotOrder[reelInfo[i].slotOrder.Length - 1 - line.winningIconIDs[i]].canAnimate = true;
					winningSlots[i * 3 + line.winningIconIDs[i]] = "Destroy";
				}
				if(payoutOrder == 1)
				{
					reelInfo[4 - i].slotOrder[reelInfo[4 - i].slotOrder.Length - 1 - line.winningIconIDs[i]].canAnimate = true;
					winningSlots[12 - inSet + line.winningIconIDs[i]] = "Destroy";
				}
			}
			line.winningIconIDs = new int[0];
		}
	}
	
	var destroySymbols : boolean = false;
	
	if(payout > 0.0)
	{
		AddCoins(payout, true);
		payout = 0.0;
		destroySymbols = true;
	}
	for(var a = 0; a < reelInfo.Length; a++)
	{
		CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 1);
		CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 2);
		CheckForAnimatedIcons(a, reelInfo[a].slotOrder.Length - 3);
	}
	
	UpdateText();
	
	var l : int;
	var n : int;
	
	for(l = 0; l < 5; l++)
	{
		for(n = 0; n < 3; n++)
		{
			if(winningSlots[l * 3 + n] == "Destroy")
			{
				ExplodeSymbol(l, n);
			}
		}
	}
	
	if(!destroySymbols)
	{
		EndSpin();
	}
	
	spinning = false;
	
	if(destroySymbols)
	{
		yield WaitForSeconds(1.1);
		DisableAllVisuals();
	}
	
	//For all the reels
	for(l = 0; l < 5; l++)
	{
		//The all the symbols on this reel
		for(n = 0; n < 3; n++)
		{
			//Tell us we can not animate
			reelInfo[l].slotOrder[n].canAnimate = false;
			
			//Tell use we are not animating
			reelInfo[l].slotOrder[n].animating = false;
			
			//Generate 3 new ID's and store it so we can cut down on function calls later
			var newSymbols : Vector3 = Vector3(GenerateNewID(), GenerateNewID(), GenerateNewID());
			
			//If we are the bottom of the reel (Top of the list)
			if(n == 0)
			{
				//If there is no symbol on the bottom
				if(reelInfo[l].slotOrder[0].sprite == null)
				{
					//If there is no symbol in the middle
					if(reelInfo[l].slotOrder[1].sprite == null)
					{
						//If there is no symbol on the top
						if(reelInfo[l].slotOrder[2].sprite == null)
						{
							//Assign a new one to the bottom
							reelInfo[l].slotOrder[0].ID = newSymbols.x;
							
							//Assign a new one in the middle
							reelInfo[l].slotOrder[1].ID = newSymbols.y;
							
							//Assign a new one on the top
							reelInfo[l].slotOrder[2].ID = newSymbols.z;
							
							//Spawn the assigned symbol for the bottom
							SpawnSymbol(l, 0);
							
							//Spawn the assigned symbol for the middle
							SpawnSymbol(l, 1);
							
							//Then spawn the assigned symbol for the top
							SpawnSymbol(l, 2);
							
							//Skip to the next reel
							break;
						}
						
						//If there is a symbol on top
						if(reelInfo[l].slotOrder[2].sprite != null)
						{
							//Assign the sprite on the top to the sprite on the bottom
							reelInfo[l].slotOrder[0].sprite = reelInfo[l].slotOrder[2].sprite;
							
							//Assign the ID on the top to the ID on the bottom
							reelInfo[l].slotOrder[0].ID = reelInfo[l].slotOrder[2].ID;
							
							//Remove the assigned sprite for the top
							reelInfo[l].slotOrder[2].sprite = null;
							
							//Assign a new ID for the middle
							reelInfo[l].slotOrder[1].ID = newSymbols.y;
							
							//Assign a new ID for the top
							reelInfo[l].slotOrder[2].ID = newSymbols.z;
							
							//Spawn the new symbol for the middle
							SpawnSymbol(l, 1);
							
							//Then spawn the new symbol for the top
							SpawnSymbol(l, 2);
							
							//Skip to the next slot
							continue;
						}
					}
					
					//If there is a symbol for the middle
					if(reelInfo[l].slotOrder[1].sprite != null)
					{
						//Assign the middle sprite to the bottom sprite
						reelInfo[l].slotOrder[0].sprite = reelInfo[l].slotOrder[1].sprite;
						
						//Assign the middle ID to the bottom ID
						reelInfo[l].slotOrder[0].ID = reelInfo[l].slotOrder[1].ID;
						
						//Remove the assigned sprite for the middle
						reelInfo[l].slotOrder[1].sprite = null;
						
						//Skip to the next slot
						continue;
					}
				}
			}
			
			//If were we are at the middle of the reel (Middle in the list)
			if(n == 1)
			{
				//If there is no sprite in the middle of the reel
				if(reelInfo[l].slotOrder[1].sprite == null)
				{
					//If there is no sprite on the top of the reel
					if(reelInfo[l].slotOrder[2].sprite == null)
					{
						//Assign a new sprite for the middle
						reelInfo[l].slotOrder[1].ID = newSymbols.y;
						
						//Assign a new sprite for the top
						reelInfo[l].slotOrder[2].ID = newSymbols.z;
						
						//Spawn the new sprite for the middle
						SpawnSymbol(l, 1);
						
						//Spawn the new sprite for the top
						SpawnSymbol(l, 2);
						
						//Skip to the next slot
						continue;
					}
					
					//If there IS a symbol above us
					if(reelInfo[l].slotOrder[2].sprite != null)
					{
						//Assign the sprite on top to the sprite in the middle
						reelInfo[l].slotOrder[1].sprite = reelInfo[l].slotOrder[2].sprite;
						
						//Assin the ID on top to the ID in the middle
						reelInfo[l].slotOrder[1].ID = reelInfo[l].slotOrder[2].ID;
						
						//Remove the sprite that's assigned on top
						reelInfo[l].slotOrder[2].sprite = null;
						
						//Assign a new ID to the top
						reelInfo[l].slotOrder[2].ID = newSymbols.z;
						
						//And spawn the new symbol for the top
						SpawnSymbol(l, 2);
						
						//Skip to the next slot
						continue;
					}
				}
			}
			
			//If were we are at the top of the reel (last in the list)
			if(n == 2)
			{
				//If there is no symbol on the top of the reel
				if(reelInfo[l].slotOrder[2].sprite == null)
				{
					//Assign a new one
					reelInfo[l].slotOrder[2].ID = newSymbols.z;
					
					//And spawn the new symbol
					SpawnSymbol(l, 2);
				}
				
				//If we have reached the last reel and we have to destroy symbols
				if(l == 4 && destroySymbols)
				{
					//Give a grace period before calculating the new payout
					yield WaitForSeconds(1);
					
					//Reset our payout
					totalPayout = 0.0;
					
					//Populate the face symbols list without generating new symbols
					PopulateFaceIcons(false);
					
					//Calculate the payout for the new line up
					CalculatePayout();
					
					//Tell us were spinning again
					spinning = true;
					
					//And tell us that we are no longer destroying symbols
					destroySymbols = false;
				}
			}
			
			//Give a slight delay before continuing the loop (Normally would not wait, but in this case it does)
			yield WaitForSeconds(0);
		}
	}
}

function SpawnSymbol(r : int, s : int)
{
	var newSprite = new GameObject();
	newSprite.AddComponent.<AudioSource>();
	newSprite.GetComponent.<AudioSource>().GetComponent.<AudioSource>().rolloffMode = 1;
	newSprite.GetComponent.<AudioSource>().GetComponent.<AudioSource>().priority = 200;
	newSprite.AddComponent.<SpriteRenderer>();
	reelInfo[r].slotOrder[s].sprite = newSprite;
	reelInfo[r].slotOrder[s].sprite.name = iconInfo[reelInfo[r].slotOrder[s].ID].Name;
	reelInfo[r].slotOrder[s].sprite.transform.localScale = Vector3(iconSize, iconSize, 1);
	newSprite.AddComponent.<Rigidbody2D>();
	newSprite.GetComponent.<Rigidbody2D>().gravityScale = 15;
	newSprite.GetComponent.<Rigidbody2D>().constraints = RigidbodyConstraints2D.FreezeRotation;
	reelInfo[r].slotOrder[s].collided = false;
	if(iconInfo.Length > 0)
	{
		reelInfo[r].slotOrder[s].sprite.GetComponent.<SpriteRenderer>().sprite = iconInfo[reelInfo[r].slotOrder[s].ID].sprite;
		reelInfo[r].slotOrder[s].size = Vector2(reelInfo[r].slotOrder[s].sprite.GetComponent.<SpriteRenderer>().bounds.extents.x * 2, reelInfo[r].slotOrder[s].sprite.GetComponent.<SpriteRenderer>().bounds.extents.y * 2);
		var lowerPos : float = reelInfo[r].slotOrder[s].sprite.GetComponent.<SpriteRenderer>().bounds.extents.y/2 - trapDoors[0].transform.position.y * 1.05;
		var split : float = reelInfo[r].slotOrder[s].size.x * 2.5;
		reelInfo[r].slotOrder[s].sprite.transform.position = Vector3(r * 1.05 * reelInfo[r].slotOrder[s].size.x - split - 0.65, lowerPos + s * 1.25 * reelInfo[r].slotOrder[s].size.y, 0);
		reelInfo[r].slotOrder[s].sprite.AddComponent.<BoxCollider2D>();
	}
	reelInfo[r].slotOrder[s].sprite.transform.parent = currentSymbolBundle.transform;
}

function EndSpin()
{
	if(tempScatter > 0)
	{
		scatterTimer = 2;
		scattersLeft += tempScatter;
		tempScatter = 0;
		if(specialAudio)
		{
			if(specialAudio.isPlaying)
			{
				specialAudio.Stop();
			}
			specialAudio.volume = audioInfo[2].audioVolume;
			specialAudio.PlayOneShot(audioInfo[2].audioClip);
		}
	}
	
	if(scattersLeft == 0)
	{
		LightenButtons();
	}
	dropping = false;
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

function UpdateText()
{
	for(var info : DisplayInfo in displayInfo)
	{
		gameObject.SendMessage("Update" + info.functionType.ToString(), info.textObject);
	}
}

function UpdateLineCount(text : TextMesh)
{
	text.text = lineCount.ToString();
}

function UpdateBetAmount(text : TextMesh)
{
	text.text = betAmounts[currentBet].ToString();
}

//////////Return to lobby function//////////
function Lobby()
{
	//Return to the lobby scene
	SceneManager.LoadScene("Lobby");
}


function PayTable()
{
	showPayTable = true;
}

function UpdateTotalWin(text : TextMesh)
{
	if(totalPayout == 0)
	{
		text.text = "";
	}
	else
	{
		text.text = totalPayout.ToString();
	}
}

function UpdateTotalBet(text : TextMesh)
{
	var totalBet = lineCount * betAmounts[currentBet];
	text.text = totalBet.ToString();
}

function DarkenButtons()
{
	for(var button : ButtonInfo in buttonInfo)
	{
		if(button.functionType != button.FunctionType.PayTable && button.functionType != button.FunctionType.Lobby && button.functionType != button.FunctionType.Settings)
		{
			if(button.sprite != null)
			{
				if(button.sprite.GetComponent.<SpriteRenderer>().material.color != Color.gray)
				{
					button.sprite.GetComponent.<SpriteRenderer>().material.color = Color.gray;
				}
			}
		}
	}
}

function LightenButtons()
{
	for(var button : ButtonInfo in buttonInfo)
	{
		if(button.sprite != null)
		{
			if(button.sprite.GetComponent.<SpriteRenderer>().material.color != Color.white)
			{
				button.sprite.GetComponent.<SpriteRenderer>().material.color = Color.white;
			}
		}
	}
}

function MaxBet()
{
	if(!dropping && !spinning && scattersLeft == 0)
	{
		lineCount = linesInfo.lineInfo.Length;
		currentBet = maxBet;
		Spin(lineCount * betAmounts[currentBet]);
	}
}

function OnGUI()
{
	//Access all of the lines information
	for(var l = 0; l < linesInfo.lineInfo.Length; l++)
	{
		//Align the words in the center
		GUI.skin.label.alignment = TextAnchor.MiddleCenter;
		
		GUI.skin.label.fontSize = linesInfo.lineNumberSize;
		
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
		
		//And display the line number on top of the lineBlock image
		GUI.Label(Rect(guiPos.x - linesInfo.lineBoxSize.x/2, guiPos.y - linesInfo.lineBoxSize.y/2, linesInfo.lineBoxSize.x, linesInfo.lineBoxSize.y), thisLineNumber.ToString());
	}
}