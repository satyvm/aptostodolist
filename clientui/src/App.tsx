import { Layout, Row, Col, Button, Spin, List, Checkbox, Input} from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Provider, Network } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import { CheckboxChangeEvent } from "antd/es/checkbox";

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { account, signAndSubmitTransaction } = useWallet();
  const [accountHasList, setAccountHasList] = useState<boolean>(false);
  const fetchList = async () => {
    if (!account) return [];
    try {
      const TodoListResource = await provider.getAccountResource(
        account?.address,
        `${moduleAddress}::todolist::TodoList`
      );
      setAccountHasList(true);
      const tableHandle = (TodoListResource as any).data.tasks.handle;
      const taskCounter = (TodoListResource as any).data.task_counter;
  
      let tasks = [];
      let counter = 1;
      while (counter <= taskCounter) {
        const tableItem = {
          key_type: "u64",
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${counter}`,
        };
        const task = await provider.getTableItem(tableHandle, tableItem);
        tasks.push(task);
        counter++;
      }
      setTasks(tasks);
    } catch (e: any) {
      setAccountHasList(false);
    }
  };
  useEffect(() => {
    fetchList();
  }, [account?.address]);

  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const addNewList = async () => {
    if (!account) return [];
    setTransactionInProgress(true);
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::todolist::create_list`,
      type_arguments: [],
      arguments: [],
    };
    try {
      const response = await signAndSubmitTransaction(payload);
      await provider.waitForTransaction(response.hash);
      setAccountHasList(true);
    } catch (error: any) {
      setAccountHasList(false);
    } finally {
      setTransactionInProgress(false);
    }
  };
  const [newTask, setNewTask] = useState<string>("");

  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };
  const onTaskAdded = async () => {
    if (!account) return;
    setTransactionInProgress(true);
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::todolist::create_task`,
      type_arguments: [],
      arguments: [newTask],
    };

    const latestId = tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;
    const newTaskToPush = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: latestId + "",
    };

    try {
      const response = await signAndSubmitTransaction(payload);
      await provider.waitForTransaction(response.hash);
      let newTasks = [...tasks];
      newTasks.push(newTaskToPush);
      setTasks(newTasks);
      setNewTask("");
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };
  const onCheckboxChange = async (
    event: CheckboxChangeEvent,
    taskId: string
  ) => {
    if (!account) return;
    if (!event.target.checked) return;
    setTransactionInProgress(true);
    const payload = {
      type: "entry_function_payload",
      function:
        `${moduleAddress}::todolist::complete_task`,
      type_arguments: [],
      arguments: [taskId],
    };

    try {
      const response = await signAndSubmitTransaction(payload);
      await provider.waitForTransaction(response.hash);

      setTasks((prevState) => {
        const newState = prevState.map((obj) => {
          if (obj.task_id === taskId) {
            return { ...obj, completed: true };
          }
          return obj;
        });

        return newState;
      });
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };
  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            <h1>AptosTodoList</h1>
          </Col>
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector />
          </Col>
        </Row>
      </Layout>
      <Spin spinning={transactionInProgress}>
      {
        !accountHasList ? (
        <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
          <Col span={8} offset={8}>
            <Button
              disabled={!account}
              block
              onClick={addNewList}
              type="primary"
              style={{ height: "40px", backgroundColor: "#3f67ff" }}
            >
              Add new list
            </Button>
          </Col>
        </Row>
        ) : (
          <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
            <Col span={8} offset={8}>
              <Input.Group compact>
                <Input
                  onChange={(event) => onWriteTask(event)}
                  style={{ width: "calc(100% - 60px)" }}
                  placeholder="Add a Task"
                  size="large"
                  value={newTask}
                />
                <Button
                  onClick={onTaskAdded}
                  type="primary"
                  style={{ height: "40px", backgroundColor: "#3f67ff" }}
                >
                  Add
                </Button>
              </Input.Group>
            </Col>
            <Col span={8} offset={8}>
              {tasks && (
                <List
                  size="small"
                  bordered
                  dataSource={tasks}
                  renderItem={(task: any) => (
                    <List.Item
                        actions={[
                          <div>
                            {task.completed ? (
                              <Checkbox defaultChecked={true} disabled />
                            ) : (
                              <Checkbox
                                onChange={(event) =>
                                  onCheckboxChange(event, task.task_id)
                                }
                              />
                            )}
                          </div>,
                        ]}
                      >
                      <List.Item.Meta
                        title={task.content}
                        description={
                          <a href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                            target="_blank"
                          >{`${task.address.slice(0, 6)}...${task.address.slice(-5)}`}</a>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Col>
          </Row>
        )
      }
      </Spin>
    </>
  );
}


export const provider = new Provider(Network.DEVNET);
export const moduleAddress = "0xe93650f766d6bc5f506e418112a11f6ae433d2530c6035855f66840e622518d6";

export default App;
