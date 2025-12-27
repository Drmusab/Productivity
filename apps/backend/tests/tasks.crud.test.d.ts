// @ts-nocheck
declare const request: any;
declare const app: any;
declare const initDatabase: any, clearDatabase: any, runAsync: any, getAsync: any;
declare const createBoardWithColumns: () => Promise<{
    boardId: any;
    columnIds: any[];
}>;
declare const createTask: ({ columnId, title, position }: {
    columnId: any;
    title?: string | undefined;
    position?: number | undefined;
}) => Promise<any>;
declare const createTag: (name?: string, color?: string) => Promise<any>;
//# sourceMappingURL=tasks.crud.test.d.ts.map