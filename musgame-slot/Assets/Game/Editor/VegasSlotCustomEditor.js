@CustomEditor(VegasSlots)
class VegasSlotCustomEditor extends Editor
{
	override function OnInspectorGUI()
	{
		DrawDefaultInspector();
		
		var slotScript : VegasSlots = target;
		
		if(!Application.isPlaying)
		{
			if(GUILayout.Button("Generate A New Line Object"))
			{
				slotScript.GenerateNewLine();
			}
			if(GUILayout.Button("Reset User Stats"))
			{
				PlayerPrefs.DeleteAll();
			}
		}
		
		if(Application.isPlaying)
		{
			GUILayout.BeginHorizontal();
			if(GUILayout.Button("Force A Bonus"))
			{
				if(slotScript.spinning)
				{
					slotScript.tempBonusState = 3;
				}
				else
				{
					Debug.Log("You can only force a bonus game during a spin");
				}
			}
			if(GUILayout.Button("Force A Scatter"))
			{
				if(slotScript.spinning)
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