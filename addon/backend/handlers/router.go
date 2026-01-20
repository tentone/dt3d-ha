package handlers

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.Engine, spaceHandler *SpaceHandler, fileHandler *FileHandler) {
	hello := NewHelloHandler()
	hello.Register(router)

	spaceHandler.Register(router)
	fileHandler.Register(router)
}
