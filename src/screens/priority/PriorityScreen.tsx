import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput } from 'react-native';

export interface Task {
  taskId: number;
  userId: number;
  taskName: string;
  urgency: 'High' | 'Medium' | 'Low';
  importance: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'InProgress' | 'Completed';
}

export function PriorityScreen() {
  const [taskName, setTaskName] = useState<string>("");
  const [urgency, setUrgency] = useState<"High" | "Medium" | "Low">("Medium");
  const [importance, setImportance] = useState<"High" | "Medium" | "Low">("Medium");
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isRanked, setIsRanked] = useState<boolean>(false);

  const addTask = () => {
    if (taskName.trim() === "") return;
    const newTask: Task = {
      taskId: Date.now(),
      userId: 1,
      taskName,
      urgency,
      importance,
      status: 'Pending'
    };
    setTaskList([...taskList, newTask]);
    setTaskName("");
    setIsRanked(false); // Reset to false when new data is added
  };

  const completeTask = (taskId: number) => {
  // Filter out the task by ID to remove it from the list
    setTaskList(taskList.filter(t => t.taskId !== taskId));
    
    // can add your XP gain logic here!
    // Example: setXp(prev => prev + 50); 
    console.log("Task completed! XP added.");
  };

  const handleRankTasks = () => {
    const sorted = [...taskList].sort((a, b) => {
      const map: Record<'High' | 'Medium' | 'Low', number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const scoreA = map[a.urgency] + map[a.importance];
      const scoreB = map[b.urgency] + map[b.importance];
      return scoreB - scoreA;
    });
    setTaskList(sorted);
    setIsRanked(true);
  };

  const Selector = ({ label, selected, onSelect }: { label: string, selected: string, onSelect: (val: any) => void }) => (
    <View style={styles.selectorGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.buttonRow}>
        {(['Low', 'Medium', 'High'] as const).map((level) => (
          <TouchableOpacity 
            key={level} 
            style={[styles.smallButton, selected === level && styles.activeButton]}
            onPress={() => onSelect(level)}
          >
            <Text style={[styles.smallButtonText, selected === level && styles.activeButtonText]}>{level}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>DECISION</Text>

      <Selector label="URGENCY" selected={urgency} onSelect={setUrgency} />
      <Selector label="IMPORTANCE" selected={importance} onSelect={setImportance} />

      {/* Input Section: TextInput and + button side-by-side */}
      <View style={styles.inputSection}>
        <TextInput 
          style={styles.input}
          placeholder="Add a new task..."
          value={taskName}
          onChangeText={setTaskName}
        />
        <TouchableOpacity style={styles.plusButton} onPress={addTask}>
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Only show the status badge if there are tasks in the list */}
      {taskList.length > 0 && (
        <View style={[styles.statusBadge, { backgroundColor: isRanked ? '#000' : '#FFD700' }]}>
          <Text style={[styles.statusText, { color: isRanked ? '#FFF' : '#000' }]}>
            {isRanked ? "MODE: SORTED BY PRIORITY" : "MODE: UNSORTED (NEW TASKS ADDED)"}
          </Text>
        </View>
      )}

      <FlatList
        data={taskList}
        keyExtractor={(item) => item.taskId.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.taskTitle}>{item.taskName}</Text>
        {/* Text-based action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => completeTask(item.taskId)}>
                  <Text style={styles.completeText}>COMPLETE</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTaskList(taskList.filter(t => t.taskId !== item.taskId))}>
                  <Text style={styles.deleteText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.tagRow}>
              <View style={styles.tag}><Text style={styles.tagText}>URGENCY: {item.urgency.toUpperCase()}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>IMPORTANCE: {item.importance.toUpperCase()}</Text></View>
            </View>
          </View>
        )}
        ListFooterComponent={
          taskList.length >= 2 ? (
            <TouchableOpacity style={styles.rankButton} onPress={handleRankTasks}>
              <Text style={styles.rankButtonText}>RANK MY TASKS</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    backgroundColor: '#F7F4EF' 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '900', 
    marginBottom: 20 
  },
  inputSection: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 20 
  },
  input: { 
    flex: 1, 
    borderWidth: 3, 
    borderColor: '#000', 
    padding: 15, 
    backgroundColor: '#FFF',
    fontWeight: '600'
  },
  plusButton: { 
    backgroundColor: '#7B5EA7', 
    width: 60, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 3, 
    borderColor: '#000' 
  },
  plusButtonText: { 
    color: '#FFF', 
    fontSize: 24, 
    fontWeight: '900' 
  },
  selectorGroup: { marginBottom: 15 },
  label: { fontWeight: '900', marginBottom: 5, fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  smallButton: { 
    flex: 1, 
    padding: 12, 
    borderWidth: 3, 
    borderColor: '#000', 
    alignItems: 'center' 
  },
  activeButton: { backgroundColor: '#000' },
  smallButtonText: { fontWeight: 'bold', fontSize: 12 },
  activeButtonText: { color: '#FFF' },
  card: { 
    padding: 15, 
    marginBottom: 10, 
    backgroundColor: '#fff', 
    borderWidth: 3, 
    borderColor: '#000' 
  },
  cardRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 5 
  },
  taskTitle: { fontWeight: '900', fontSize: 16 },
  tagRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tag: { 
    backgroundColor: '#F0F0F0', 
    padding: 5, 
    borderWidth: 2, 
    borderColor: '#000' 
  },
  tagText: { fontSize: 10, fontWeight: '900' },
  rankButton: { 
    backgroundColor: '#000', 
    padding: 20, 
    alignItems: 'center', 
    marginTop: 'auto', 
    marginBottom: 20 
  },
  rankButtonText: { 
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 16 
  },
  actionRow: { 
  flexDirection: 'row', 
  gap: 15 
  },
  completeText: { 
    color: '#28A745', 
    fontWeight: '900', 
    fontSize: 12 
  },
  deleteText: { 
    color: '#DC3545', 
    fontWeight: '900', 
    fontSize: 12 
  },
  statusBadge: { 
  backgroundColor: '#000', 
  padding: 10, 
  alignItems: 'center', 
  marginBottom: 10 
  },
  statusText: { 
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 10, 
    letterSpacing: 1 
  }
});