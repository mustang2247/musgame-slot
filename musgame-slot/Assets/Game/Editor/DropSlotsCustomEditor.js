@CustomEditor(DropSlots)
class DropSlotsCustomEditor extends Editor
{
	override function OnInspectorGUI()
	{
		DrawDefaultInspector();
		
		var slotScript : DropSlots = target;
		
		if(!Application.isPlaying)
		{
			if(GUILayout.Button("Generate A New Line Object"))
			{
				slotScript.GenerateNewLine();
			}
			if(GUILayout.Button("Reset User Stats"))
			{
				PlayerPrefs.DeleteKey("Coins");
				PlayerPrefs.DeleteKey("Level");
				PlayerPrefs.DeleteKey("Experience");
				PlayerPrefs.DeleteKey("LastLevelExperience");
				PlayerPrefs.DeleteKey("ExperienceToLevel");
			}
			GUILayout.BeginHorizontal();
			if(GUILayout.Button("Unity Asset Store"))
			{
				Application.OpenURL("http://assetstore.unity3d.com/");
			}
			if(GUILayout.Button("Unity Magic Asset Store"))
			{
				Application.OpenURL("http://unitymagic.com/");
			}
			GUILayout.EndHorizontal();
		}
		
		if(Application.isPlaying)
		{
			GUILayout.BeginHorizontal();
			if(GUILayout.Button("Force A Scatter"))
			{
				if(slotScript.dropping)
				{
					slotScript.tempScatter = 3;
				}
				else
				{
					Debug.Log("You can only force a scatter during a spin");
				}
			}
			GUILayout.EndHorizontal();
		}
	}
}